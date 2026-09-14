"""Honest accuracy check on the real Vikram landing-site pair (OHRC -> LRO NAC).

1. Baseline: SIFT + Lowe ratio + RANSAC homography, as in
   app/services/final_real_registration.py, reporting the RMSE on its own
   inliers (what that script prints) and the held-out RMSE.
2. Refined: tie points on a regular grid over the reference, refined to
   sub-pixel precision by NCC through the baseline mapping. Gross outliers are
   dropped with a median-absolute-deviation test, then several geometric models
   are compared.

Two held-out figures are printed. "random" is 5-fold cross-validation over
points. "blocks" holds out whole 500x500 px blocks, so the model is judged on
ground it never saw; on a dense grid this is the figure to quote, because
random folds always leave a neighbouring point in the training set.

Run from backend/:  python scripts/evaluate_vikram_site.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.registration.imaging import load_image, normalize_to_uint8  # noqa: E402
from app.registration.metrics import holdout_rmse, point_errors, rmse, spatial_coverage  # noqa: E402
from app.registration.subpixel import refine_correspondences  # noqa: E402

SITE = BACKEND / "data" / "vikram_site"
OHRC = SITE / "ohrc" / "vikram_landing_site_2km_ohrc_1m.tif"
NASA = SITE / "nac_ortho" / "vikram_landing_site_2km.tif"

RATIO = 0.65
RANSAC_THRESHOLD = 3.0
GRID_STEP = 40
PATCH_SIZE = 48
BLOCK_SIZE = 500
OUTLIER_MADS = 3.0


def homography_fit(reference_points: np.ndarray, source_points: np.ndarray):
    """Least-squares reference -> source homography, as a predict function."""
    H, _ = cv2.findHomography(reference_points.astype(np.float64), source_points.astype(np.float64), 0)

    def predict(points: np.ndarray) -> np.ndarray:
        return cv2.perspectiveTransform(points.reshape(-1, 1, 2).astype(np.float64), H).reshape(-1, 2)

    return predict


def polynomial_fit(degree: int):
    """Least-squares 2-D polynomial reference -> source mapping of the given degree."""

    def fit(reference_points: np.ndarray, source_points: np.ndarray):
        centre = reference_points.mean(axis=0)
        scale = reference_points.std()

        def terms(points: np.ndarray) -> np.ndarray:
            x, y = ((points - centre) / scale).T
            return np.column_stack([x**i * y**j for i in range(degree + 1) for j in range(degree + 1 - i)])

        coefficients, *_ = np.linalg.lstsq(terms(reference_points), source_points, rcond=None)
        return lambda points: terms(np.asarray(points, dtype=np.float64)) @ coefficients

    return fit


MODELS = {
    "homography": homography_fit,
    "polynomial-2": polynomial_fit(2),
    "polynomial-3": polynomial_fit(3),
    "polynomial-4": polynomial_fit(4),
}


def sift_baseline(source: np.ndarray, reference: np.ndarray):
    sift = cv2.SIFT_create(nfeatures=5000)
    source_kp, source_desc = sift.detectAndCompute(source, None)
    reference_kp, reference_desc = sift.detectAndCompute(reference, None)
    pairs = cv2.BFMatcher(cv2.NORM_L2).knnMatch(source_desc, reference_desc, k=2)
    good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < RATIO * n.distance]

    src = np.float64([source_kp[m.queryIdx].pt for m in good])
    ref = np.float64([reference_kp[m.trainIdx].pt for m in good])
    H, mask = cv2.findHomography(src, ref, cv2.RANSAC, RANSAC_THRESHOLD)
    inliers = mask.ravel().astype(bool)
    return src[inliers], ref[inliers], H, len(good)


def spatial_blocks(points: np.ndarray, width: int) -> np.ndarray:
    columns = int(np.ceil(width / BLOCK_SIZE))
    return (points[:, 1] // BLOCK_SIZE) * columns + points[:, 0] // BLOCK_SIZE


def print_row(name: str, ref: np.ndarray, src: np.ndarray, fit, width: int, gsd: float | None) -> None:
    random = holdout_rmse(ref, src, fit)
    blocks = holdout_rmse(ref, src, fit, groups=spatial_blocks(ref, width))
    metres = f"{blocks.rmse * gsd:6.2f} m" if gsd else ""
    print(
        f"  {name:<13} {len(ref):>5}  {random.fit_rmse:6.3f}  {random.rmse:6.3f}  "
        f"{blocks.rmse:6.3f}  {np.nanmedian(blocks.errors):6.3f}  {np.nanpercentile(blocks.errors, 90):6.3f}  {metres}"
    )


def print_header() -> None:
    print(f"  {'model':<13} {'points':>5}  {'fit':>6}  {'random':>6}  {'blocks':>6}  {'median':>6}  {'p90':>6}")


def main() -> None:
    ohrc = load_image(OHRC)
    nasa = load_image(NASA)
    gsd = nasa.metadata.get("gsd")
    height, width = nasa.shape
    print(f"OHRC {ohrc.shape} {ohrc.source_dtype} | NAC {nasa.shape} {nasa.source_dtype}, {gsd:.2f} m/px")
    print("All errors in reference pixels; 'blocks' is the held-out figure to quote.")

    src, ref, H_src_to_ref, good = sift_baseline(normalize_to_uint8(ohrc.data, 2, 98), normalize_to_uint8(nasa.data, 2, 98))
    script_errors = point_errors(cv2.perspectiveTransform(src.reshape(-1, 1, 2), H_src_to_ref).reshape(-1, 2), ref)
    coverage = spatial_coverage(ref, nasa.shape)
    print(f"\n1. Baseline SIFT + RANSAC: {good} ratio-test matches, {len(src)} inliers")
    print(f"   RMSE printed by final_real_registration.py: {rmse(script_errors):.3f} px (on its own inliers)")
    print(f"   coverage 8x8 {coverage.coverage:.2f}, uniformity {coverage.uniformity:.2f}")
    print_header()
    print_row("homography", ref, src, homography_fit, width, gsd)

    H_ref_to_src = np.linalg.inv(H_src_to_ref)

    def mapping(points: np.ndarray) -> np.ndarray:
        return cv2.perspectiveTransform(points.reshape(-1, 1, 2).astype(np.float64), H_ref_to_src).reshape(-1, 2)

    xs, ys = np.meshgrid(
        np.arange(PATCH_SIZE, width - PATCH_SIZE, GRID_STEP), np.arange(PATCH_SIZE, height - PATCH_SIZE, GRID_STEP)
    )
    grid = np.column_stack([xs.ravel(), ys.ravel()]).astype(np.float64)
    refined = refine_correspondences(nasa.data, ohrc.data, grid, mapping, patch_size=PATCH_SIZE)
    grid_ref, grid_src = grid[refined.valid], refined.source_points[refined.valid]

    residuals = point_errors(homography_fit(grid_ref, grid_src)(grid_ref), grid_src)
    median = np.median(residuals)
    mad = 1.4826 * np.median(np.abs(residuals - median))
    keep = residuals <= median + OUTLIER_MADS * mad
    grid_ref, grid_src = grid_ref[keep], grid_src[keep]

    coverage = spatial_coverage(grid_ref, nasa.shape)
    print(
        f"\n2. Grid + NCC sub-pixel: {refined.valid.sum()} / {len(grid)} points refined "
        f"(median NCC {np.median(refined.scores[refined.valid]):.2f}), {int((~keep).sum())} outliers dropped"
    )
    print(f"   coverage 8x8 {coverage.coverage:.2f}, uniformity {coverage.uniformity:.2f}")
    print_header()
    for name, fit in MODELS.items():
        print_row(name, grid_ref, grid_src, fit, width, gsd)


if __name__ == "__main__":
    main()
