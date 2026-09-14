"""Geometric models and hold-out based model selection.

Every model maps reference pixels to source pixels. The model is chosen by the
error on held-out spatial blocks, not by the fit error, so a flexible model is
only picked when it predicts unseen ground better. Among models within a small
tolerance of the best, the simplest one wins.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import cv2
import numpy as np
from scipy import sparse
from scipy.ndimage import map_coordinates, spline_filter
from scipy.sparse.linalg import spsolve

from .metrics import HoldoutReport, holdout_rmse, point_errors

Predict = Callable[[np.ndarray], np.ndarray]
Fit = Callable[[np.ndarray, np.ndarray], Predict]


def fit_homography(reference_points: np.ndarray, source_points: np.ndarray) -> Predict:
    """Least-squares reference -> source homography."""
    H, _ = cv2.findHomography(np.asarray(reference_points, np.float64), np.asarray(source_points, np.float64), 0)
    if H is None:
        raise ValueError("Homography fit failed")
    return homography_mapping(H)


def homography_mapping(H: np.ndarray) -> Predict:
    def predict(points: np.ndarray) -> np.ndarray:
        points = np.asarray(points, dtype=np.float64).reshape(-1, 1, 2)
        return cv2.perspectiveTransform(points, H).reshape(-1, 2)

    return predict


def polynomial_fitter(degree: int) -> Fit:
    """Least-squares 2-D polynomial reference -> source mapping of the given degree."""

    def fit(reference_points: np.ndarray, source_points: np.ndarray) -> Predict:
        reference_points = np.asarray(reference_points, dtype=np.float64)
        centre = reference_points.mean(axis=0)
        scale = max(float(reference_points.std()), 1e-9)

        def terms(points: np.ndarray) -> np.ndarray:
            x, y = ((np.asarray(points, dtype=np.float64).reshape(-1, 2) - centre) / scale).T
            return np.column_stack([x**i * y**j for i in range(degree + 1) for j in range(degree + 1 - i)])

        design = terms(reference_points)
        if len(design) < design.shape[1]:
            raise ValueError(f"Degree-{degree} polynomial needs at least {design.shape[1]} points")
        coefficients, *_ = np.linalg.lstsq(design, np.asarray(source_points, dtype=np.float64), rcond=None)
        return lambda points: terms(points) @ coefficients

    return fit


def _grid_laplacian(rows: int, cols: int) -> sparse.csr_matrix:
    index = np.arange(rows * cols).reshape(rows, cols)
    first = np.concatenate([index[:, :-1].ravel(), index[:-1, :].ravel()])
    second = np.concatenate([index[:, 1:].ravel(), index[1:, :].ravel()])
    size = rows * cols
    adjacency = sparse.csr_matrix(
        (np.ones(2 * len(first)), (np.concatenate([first, second]), np.concatenate([second, first]))), shape=(size, size)
    )
    return (sparse.diags(np.asarray(adjacency.sum(axis=1)).ravel()) - adjacency).tocsr()


def _regular_grid(points: np.ndarray, tolerance: float = 0.01) -> tuple[float, float, float]:
    """(step, x0, y0) of the regular lattice the points lie on; raises ValueError otherwise."""
    xs, ys = np.unique(np.round(points[:, 0], 6)), np.unique(np.round(points[:, 1], 6))
    diffs = np.concatenate([np.diff(xs), np.diff(ys)])
    if diffs.size == 0 or diffs.min() <= 0:
        raise ValueError("Grid residual model needs points on a regular grid")
    step = float(diffs.min())
    x0, y0 = float(xs[0]), float(ys[0])
    offsets = np.column_stack([(points[:, 0] - x0) / step, (points[:, 1] - y0) / step])
    if np.abs(offsets - np.round(offsets)).max() > tolerance:
        raise ValueError("Grid residual model needs points on a regular grid")
    return step, x0, y0


def grid_residual_fitter(base: Fit, padding: int = 4) -> Fit:
    """A global model plus a local correction field on the tie-point lattice.

    Residuals of the global model are placed on the regular grid the tie points
    were sampled on. Grid nodes without a tie point (gaps, image borders, held-out
    blocks) are filled by harmonic interpolation, i.e. the solution of Laplace's
    equation with the known residuals fixed, which never exceeds the range of the
    measured residuals. Between nodes the field is interpolated with cubic
    B-splines. This captures local distortion from terrain relief and sensor
    geometry that no single global polynomial can follow.
    """

    def fit(reference_points: np.ndarray, source_points: np.ndarray) -> Predict:
        reference_points = np.asarray(reference_points, dtype=np.float64)
        global_predict = base(reference_points, source_points)
        residuals = np.asarray(source_points, dtype=np.float64) - global_predict(reference_points)

        step, x0, y0 = _regular_grid(reference_points)
        x0, y0 = x0 - padding * step, y0 - padding * step
        cols = int(round((reference_points[:, 0].max() - x0) / step)) + 1 + padding
        rows = int(round((reference_points[:, 1].max() - y0) / step)) + 1 + padding
        col = np.round((reference_points[:, 0] - x0) / step).astype(int)
        row = np.round((reference_points[:, 1] - y0) / step).astype(int)

        known = np.zeros(rows * cols, dtype=bool)
        values = np.zeros((rows * cols, 2))
        flat = row * cols + col
        known[flat] = True
        values[flat] = residuals

        laplacian = _grid_laplacian(rows, cols)
        unknown = ~known
        if unknown.any():
            system = laplacian[unknown][:, unknown].tocsc()
            rhs = -(laplacian[unknown][:, known] @ values[known])
            values[unknown] = np.column_stack([spsolve(system, rhs[:, c]) for c in range(2)])

        coefficients = [spline_filter(values[:, c].reshape(rows, cols), order=3, mode="nearest") for c in range(2)]

        def predict(points: np.ndarray) -> np.ndarray:
            points = np.asarray(points, dtype=np.float64).reshape(-1, 2)
            coords = [(points[:, 1] - y0) / step, (points[:, 0] - x0) / step]
            correction = np.column_stack(
                [map_coordinates(c, coords, order=3, mode="nearest", prefilter=False) for c in coefficients]
            )
            return global_predict(points) + correction

        return predict

    return fit


@dataclass(frozen=True)
class ModelSpec:
    name: str
    fit: Fit
    parameters: int  # used to order models from simple to flexible
    local: bool = False  # passes through its tie points, so its fit residuals cannot reveal outliers


DEFAULT_MODELS = (
    ModelSpec("homography", fit_homography, 8),
    ModelSpec("polynomial-2", polynomial_fitter(2), 12),
    ModelSpec("polynomial-3", polynomial_fitter(3), 20),
    ModelSpec("polynomial-4", polynomial_fitter(4), 30),
    ModelSpec("polynomial-5", polynomial_fitter(5), 42),
    # One free residual per tie point: only chosen when it predicts held-out blocks clearly better.
    ModelSpec("polynomial-4+local", grid_residual_fitter(polynomial_fitter(4)), 10_000, local=True),
)


def spatial_blocks(points: np.ndarray, image_shape: tuple[int, int], blocks: tuple[int, int] = (4, 4)) -> np.ndarray:
    """Block id of each point on a rows x cols partition of the image."""
    height, width = image_shape[:2]
    rows, cols = blocks
    points = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    cell_x = np.clip((points[:, 0] / width * cols).astype(int), 0, cols - 1)
    cell_y = np.clip((points[:, 1] / height * rows).astype(int), 0, rows - 1)
    return cell_y * cols + cell_x


@dataclass
class ModelSelection:
    name: str
    predict: Predict  # fitted on all points
    reports: dict[str, HoldoutReport]  # block hold-out report of every candidate that could be fitted

    @property
    def report(self) -> HoldoutReport:
        return self.reports[self.name]


def select_model(
    reference_points: np.ndarray,
    source_points: np.ndarray,
    image_shape: tuple[int, int],
    candidates: tuple[ModelSpec, ...] = DEFAULT_MODELS,
    blocks: tuple[int, int] = (4, 4),
    tolerance: float = 0.02,
) -> ModelSelection:
    """Pick the model with the lowest block hold-out RMSE, preferring simpler ones within `tolerance` (relative)."""
    groups = spatial_blocks(reference_points, image_shape, blocks)
    reports: dict[str, HoldoutReport] = {}
    for spec in sorted(candidates, key=lambda s: s.parameters):
        try:
            reports[spec.name] = holdout_rmse(reference_points, source_points, spec.fit, groups=groups)
        except (ValueError, np.linalg.LinAlgError, cv2.error):
            continue  # too few points in some fold for this model
    reports = {name: report for name, report in reports.items() if np.isfinite(report.rmse)}
    if not reports:
        raise ValueError("No geometric model could be evaluated on these correspondences")

    best = min(report.rmse for report in reports.values())
    by_name = {spec.name: spec for spec in candidates}
    chosen = next(name for name in reports if reports[name].rmse <= best * (1 + tolerance))
    return ModelSelection(chosen, by_name[chosen].fit(reference_points, source_points), reports)


def mad_inliers(errors: np.ndarray, n_mads: float = 3.0) -> np.ndarray:
    """True for errors within median + n_mads * (scaled median absolute deviation)."""
    errors = np.asarray(errors, dtype=np.float64)
    median = np.median(errors)
    mad = 1.4826 * np.median(np.abs(errors - median))
    return errors <= median + n_mads * max(mad, 1e-6)


def residuals(predict: Predict, reference_points: np.ndarray, source_points: np.ndarray) -> np.ndarray:
    return point_errors(predict(reference_points), source_points)
