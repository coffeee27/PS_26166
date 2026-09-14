"""Accuracy and distribution metrics.

RMSE is reported two ways: on the points used to fit the model (optimistic) and
on held-out points via k-fold cross-validation (honest). Only the held-out
figure should be quoted as registration accuracy.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

# fit(reference_points, source_points) -> predict(reference_points) -> source_points
FitFunction = Callable[[np.ndarray, np.ndarray], Callable[[np.ndarray], np.ndarray]]


def point_errors(predicted: np.ndarray, actual: np.ndarray) -> np.ndarray:
    return np.hypot(*(np.asarray(predicted) - np.asarray(actual)).T)


def rmse(errors: np.ndarray) -> float:
    errors = np.asarray(errors)
    return float(np.sqrt(np.mean(errors**2))) if errors.size else float("nan")


@dataclass
class HoldoutReport:
    rmse: float  # held-out RMSE, pixels
    fit_rmse: float  # RMSE on the fitting points, pixels (optimistic)
    errors: np.ndarray  # (N,) held-out error of every point (NaN if never held out)
    folds: int


def holdout_rmse(
    reference_points: np.ndarray,
    source_points: np.ndarray,
    fit: FitFunction,
    folds: int = 5,
    seed: int = 0,
) -> HoldoutReport:
    """K-fold cross-validated error: each point is predicted by a model that never saw it."""
    ref = np.asarray(reference_points, dtype=np.float64)
    src = np.asarray(source_points, dtype=np.float64)
    count = len(ref)
    if count < folds * 2:
        raise ValueError(f"Need at least {folds * 2} correspondences for {folds}-fold hold-out")

    order = np.random.default_rng(seed).permutation(count)
    errors = np.full(count, np.nan)
    for held_out in np.array_split(order, folds):
        train = np.setdiff1d(order, held_out, assume_unique=True)
        predict = fit(ref[train], src[train])
        errors[held_out] = point_errors(predict(ref[held_out]), src[held_out])

    full_model = fit(ref, src)
    fit_errors = point_errors(full_model(ref), src)
    return HoldoutReport(rmse=rmse(errors), fit_rmse=rmse(fit_errors), errors=errors, folds=folds)


@dataclass
class CoverageReport:
    coverage: float  # fraction of grid cells containing at least one point
    uniformity: float  # 1 / (1 + coefficient of variation of per-cell counts), 1 = perfectly even
    counts: np.ndarray  # (rows, cols) points per cell


def spatial_coverage(points: np.ndarray, image_shape: tuple[int, int], grid: tuple[int, int] = (8, 8)) -> CoverageReport:
    """How evenly points spread over the image, on a rows x cols grid."""
    height, width = image_shape[:2]
    rows, cols = grid
    counts = np.zeros((rows, cols), dtype=int)
    pts = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    inside = (pts[:, 0] >= 0) & (pts[:, 0] < width) & (pts[:, 1] >= 0) & (pts[:, 1] < height)
    for x, y in pts[inside]:
        counts[min(int(y / height * rows), rows - 1), min(int(x / width * cols), cols - 1)] += 1

    mean = counts.mean()
    uniformity = 1.0 / (1.0 + counts.std() / mean) if mean > 0 else 0.0
    return CoverageReport(coverage=float(np.count_nonzero(counts) / counts.size), uniformity=float(uniformity), counts=counts)


def pixels_to_metres(pixels: float, gsd: float | None) -> float | None:
    return None if gsd is None else float(pixels * gsd)
