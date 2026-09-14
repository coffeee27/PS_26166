"""End-to-end registration: coarse matching -> sub-pixel tie points -> model selection.

1. Resolution alignment: the source is resampled to the reference ground
   sample distance when both are known.
2. Coarse: SIFT matches on downsampled images (long side capped for long
   strips), MAGSAC++ homography, refitted on grid-balanced inliers (matching.py).
3. Fine, repeated `passes` times: a regular grid of reference tie points is
   cropped to the overlap with the source, refined by NCC through the current
   mapping, screened for gross outliers with a MAD test on the best global model,
   and the geometric model with the lowest spatial-block hold-out RMSE (global or
   polynomial plus local grid correction) becomes the mapping for the next pass.

All accuracy figures are held-out errors in reference pixels.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

import cv2
import numpy as np

from .geometry import DEFAULT_MODELS, ModelSelection, ModelSpec, Predict, fit_homography, homography_mapping, mad_inliers, residuals, select_model
from .imaging import Resampling, resample_to_gsd
from .matching import balance_by_grid, match_features, robust_homography
from .metrics import CoverageReport, spatial_coverage
from .subpixel import refine_correspondences


@dataclass
class RegistrationConfig:
    match_scale: float = 0.5
    match_max_side: int = 3000  # coarse images are shrunk further so long strips stay tractable
    match_ratio: float = 0.8
    magsac_threshold: float = 3.0  # reference pixels
    balance_grid: tuple[int, int] = (8, 8)
    balance_per_cell: int = 25
    grid_step: int = 40
    patch_size: int = 48
    search_radius: int = 6
    min_ncc: float = 0.5
    passes: int = 2
    outlier_mads: float = 3.0
    holdout_blocks: tuple[int, int] = (4, 4)
    models: tuple[ModelSpec, ...] = DEFAULT_MODELS
    min_tie_points: int = 50


@dataclass
class RegistrationResult:
    model: str
    mapping: Predict  # reference pixels -> native source pixels
    reference_points: np.ndarray  # (N, 2) final tie points, reference pixels
    source_points: np.ndarray  # (N, 2) matching native source pixels
    holdout_errors: np.ndarray  # (N,) held-out error of each tie point, reference pixels
    holdout_rmse: float  # spatial-block hold-out RMSE, reference pixels
    fit_rmse: float
    model_rmse: dict[str, float]  # hold-out RMSE of every candidate model
    coverage: CoverageReport
    reference_gsd: float | None
    stats: dict = field(default_factory=dict)

    @property
    def holdout_rmse_m(self) -> float | None:
        return None if self.reference_gsd is None else self.holdout_rmse * self.reference_gsd

    def summary(self) -> dict:
        return {
            "model": self.model,
            "holdout_rmse_px": round(self.holdout_rmse, 4),
            "holdout_rmse_m": None if self.holdout_rmse_m is None else round(self.holdout_rmse_m, 4),
            "fit_rmse_px": round(self.fit_rmse, 4),
            "model_rmse_px": {name: round(value, 4) for name, value in self.model_rmse.items()},
            "tie_points": int(len(self.reference_points)),
            "coverage": round(self.coverage.coverage, 3),
            "uniformity": round(self.coverage.uniformity, 3),
            **self.stats,
        }


def lattice_mapping(mapping: Predict, shape: tuple[int, int], step: float = 4.0, margin: float = 64.0) -> Predict:
    """Evaluate a smooth mapping once on a lattice and interpolate it with cubic B-splines.

    NCC refinement queries the mapping for thousands of small windows; this makes
    each query cheap for any model. The mappings used here vary on scales of tens
    of pixels, so a 4 px lattice reproduces them to within a few thousandths of a pixel.
    """
    from scipy.ndimage import map_coordinates, spline_filter

    height, width = shape[:2]
    # Spline accuracy drops within a couple of nodes of the lattice edge, so pad beyond the requested margin.
    margin = margin + 4 * step
    xs = np.arange(-margin, width + margin + step, step)
    ys = np.arange(-margin, height + margin + step, step)
    gx, gy = np.meshgrid(xs, ys)
    values = mapping(np.column_stack([gx.ravel(), gy.ravel()])).reshape(len(ys), len(xs), 2)
    coefficients = [spline_filter(values[..., c], order=3, mode="nearest") for c in range(2)]

    def predict(points: np.ndarray) -> np.ndarray:
        points = np.asarray(points, dtype=np.float64).reshape(-1, 2)
        coords = [(points[:, 1] + margin) / step, (points[:, 0] + margin) / step]
        return np.column_stack([map_coordinates(c, coords, order=3, mode="nearest", prefilter=False) for c in coefficients])

    return predict


def overlap_mask(grid: np.ndarray, mapping: Predict, reference: np.ndarray, source_shape: tuple[int, int], margin: float) -> np.ndarray:
    """Grid points whose reference pixel is valid and whose mapped position lies inside the source image."""
    mapped = mapping(grid)
    height, width = source_shape[:2]
    inside = (
        np.isfinite(mapped).all(axis=1)
        & (mapped[:, 0] >= margin) & (mapped[:, 0] <= width - 1 - margin)
        & (mapped[:, 1] >= margin) & (mapped[:, 1] <= height - 1 - margin)
    )
    rows = np.clip(np.round(grid[:, 1]).astype(int), 0, reference.shape[0] - 1)
    cols = np.clip(np.round(grid[:, 0]).astype(int), 0, reference.shape[1] - 1)
    return inside & np.isfinite(reference[rows, cols])


def _tie_point_grid(shape: tuple[int, int], step: int, margin: int) -> np.ndarray:
    height, width = shape
    xs, ys = np.meshgrid(np.arange(margin, width - margin, step), np.arange(margin, height - margin, step))
    return np.column_stack([xs.ravel(), ys.ravel()]).astype(np.float64)


def register(
    reference: np.ndarray,
    source: np.ndarray,
    reference_gsd: float | None = None,
    source_gsd: float | None = None,
    config: RegistrationConfig | None = None,
) -> RegistrationResult:
    """Register `source` onto `reference`; both are single-band float arrays (NaN = no data)."""
    config = config or RegistrationConfig()
    reference = np.asarray(reference, dtype=np.float32)
    source = np.asarray(source, dtype=np.float32)
    stats: dict = {}
    started = time.perf_counter()

    resampling = Resampling(1.0, 1.0)
    if reference_gsd and source_gsd and not np.isclose(reference_gsd, source_gsd, rtol=1e-3):
        source, resampling = resample_to_gsd(source, source_gsd, reference_gsd)
    stats["source_resampled_shape"] = list(source.shape)

    # Coarse stage.
    largest_side = max(*reference.shape, *source.shape)
    match_scale = min(config.match_scale, config.match_max_side / largest_side)
    matches = match_features(reference, source, scale=match_scale, ratio=config.match_ratio)
    H, inliers = robust_homography(matches, config.magsac_threshold)
    balanced = balance_by_grid(
        matches.reference_points[inliers], reference.shape, config.balance_grid, config.balance_per_cell,
        priority=matches.distances[inliers],
    )
    mapping = (
        fit_homography(matches.reference_points[inliers][balanced], matches.source_points[inliers][balanced])
        if len(balanced) >= 8
        else homography_mapping(H)
    )
    stats.update(
        putative_matches=int(len(matches.distances)),
        coarse_inliers=int(inliers.sum()),
        coarse_balanced=int(len(balanced)),
        coarse_seconds=round(time.perf_counter() - started, 2),
        match_scale=round(match_scale, 4),
    )

    # Fine stage.
    grid = _tie_point_grid(reference.shape, config.grid_step, config.patch_size // 2 + config.search_radius)
    selection: ModelSelection | None = None
    for current_pass in range(config.passes):
        # Overlap crop: only refine where the current mapping lands inside the source and the reference has data.
        overlap = grid[overlap_mask(grid, mapping, reference, source.shape, config.patch_size / 2)]
        refined = refine_correspondences(
            reference, source, overlap, mapping,
            patch_size=config.patch_size, search_radius=config.search_radius, min_score=config.min_ncc,
        )
        ref_points, src_points = overlap[refined.valid], refined.source_points[refined.valid]
        if len(ref_points) < config.min_tie_points:
            raise ValueError(f"Only {len(ref_points)} tie points survived NCC refinement; the images may not overlap")

        # Screen outliers with the best global model: a local model passes through every point, outliers included.
        global_models = tuple(m for m in config.models if not m.local) or config.models
        screening = select_model(ref_points, src_points, reference.shape, global_models, config.holdout_blocks)
        keep = mad_inliers(residuals(screening.predict, ref_points, src_points), config.outlier_mads)
        ref_points, src_points = ref_points[keep], src_points[keep]
        selection = select_model(ref_points, src_points, reference.shape, config.models, config.holdout_blocks)
        if current_pass + 1 < config.passes:
            reach = config.patch_size + 3 * config.search_radius
            mapping = lattice_mapping(selection.predict, reference.shape, margin=float(reach))
        stats[f"pass{current_pass + 1}"] = {
            "overlap_points": int(len(overlap)),
            "refined": int(refined.valid.sum()),
            "outliers": int((~keep).sum()),
            "model": selection.name,
            "holdout_rmse_px": round(selection.report.rmse, 4),
        }

    assert selection is not None
    stats["grid_points"] = int(len(overlap))  # grid points inside the overlap, the denominator of the tie-point ratio
    stats["overlap_fraction"] = round(len(overlap) / max(len(grid), 1), 3)
    stats["total_seconds"] = round(time.perf_counter() - started, 2)
    fitted = selection.predict

    return RegistrationResult(
        model=selection.name,
        mapping=lambda points: resampling.to_native(fitted(points)),
        reference_points=ref_points,
        source_points=resampling.to_native(src_points),
        holdout_errors=selection.report.errors,
        holdout_rmse=selection.report.rmse,
        fit_rmse=selection.report.fit_rmse,
        model_rmse={name: report.rmse for name, report in selection.reports.items()},
        coverage=spatial_coverage(ref_points, reference.shape),
        reference_gsd=reference_gsd,
        stats=stats,
    )


def warp_to_reference(source: np.ndarray, mapping: Predict, reference_shape: tuple[int, int], chunk_rows: int = 256) -> np.ndarray:
    """Resample the native source image onto the reference pixel grid (NaN outside the source)."""
    height, width = reference_shape[:2]
    source = np.asarray(source, dtype=np.float32)
    output = np.empty((height, width), dtype=np.float32)
    xs = np.arange(width, dtype=np.float64)
    for top in range(0, height, chunk_rows):
        rows = np.arange(top, min(top + chunk_rows, height), dtype=np.float64)
        gx, gy = np.meshgrid(xs, rows)
        mapped = mapping(np.column_stack([gx.ravel(), gy.ravel()]))
        output[top : top + len(rows)] = cv2.remap(
            source,
            mapped[:, 0].reshape(gx.shape).astype(np.float32),
            mapped[:, 1].reshape(gx.shape).astype(np.float32),
            cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=float("nan"),
        )
    return output
