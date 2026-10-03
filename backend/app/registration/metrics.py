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
    groups: np.ndarray | None = None,
) -> HoldoutReport:
    """K-fold cross-validated error: each point is predicted by a model that never saw it.

    With `groups` (e.g. a spatial block id per point) whole groups are held out
    together, one per fold. Dense tie-point grids need this: with random folds a
    held-out point always has near-identical neighbours in the training set, which
    hides overfitting.
    """
    ref = np.asarray(reference_points, dtype=np.float64)
    src = np.asarray(source_points, dtype=np.float64)
    count = len(ref)
    if groups is None:
        if count < folds * 2:
            raise ValueError(f"Need at least {folds * 2} correspondences for {folds}-fold hold-out")
        order = np.random.default_rng(seed).permutation(count)
        splits = np.array_split(order, folds)
    else:
        groups = np.asarray(groups).reshape(-1)
        if len(groups) != count:
            raise ValueError("groups must have one entry per correspondence")
        splits = [np.flatnonzero(groups == group) for group in np.unique(groups)]
        if len(splits) < 2:
            raise ValueError("Need at least 2 groups for grouped hold-out")
        folds = len(splits)

    all_indices = np.arange(count)
    errors = np.full(count, np.nan)
    for held_out in splits:
        train = np.setdiff1d(all_indices, held_out, assume_unique=True)
        predict = fit(ref[train], src[train])
        errors[held_out] = point_errors(predict(ref[held_out]), src[held_out])

    full_model = fit(ref, src)
    fit_errors = point_errors(full_model(ref), src)
    return HoldoutReport(rmse=rmse(errors), fit_rmse=rmse(fit_errors), errors=errors, folds=folds)


# (x0, y0, x1, y1) in reference pixels, edges included.
Bounds = tuple[float, float, float, float]


def bounding_box(points: np.ndarray) -> Bounds:
    pts = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    return (float(pts[:, 0].min()), float(pts[:, 1].min()), float(pts[:, 0].max()), float(pts[:, 1].max()))


def cell_indices(points: np.ndarray, bounds: Bounds, grid: tuple[int, int]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Row and column of each point on a rows x cols grid over `bounds`, plus an inside-bounds mask."""
    x0, y0, x1, y1 = bounds
    rows, cols = grid
    pts = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    inside = (pts[:, 0] >= x0) & (pts[:, 0] <= x1) & (pts[:, 1] >= y0) & (pts[:, 1] <= y1)
    row = np.clip(((pts[:, 1] - y0) / max(y1 - y0, 1e-9) * rows).astype(int), 0, rows - 1)
    col = np.clip(((pts[:, 0] - x0) / max(x1 - x0, 1e-9) * cols).astype(int), 0, cols - 1)
    return row, col, inside


def cell_counts(points: np.ndarray, bounds: Bounds, grid: tuple[int, int]) -> np.ndarray:
    row, col, inside = cell_indices(points, bounds, grid)
    counts = np.zeros(grid, dtype=int)
    np.add.at(counts, (row[inside], col[inside]), 1)
    return counts


@dataclass
class CoverageReport:
    coverage: float  # fraction of the cells a tie point could fall in that hold at least one
    uniformity: float  # 1 / (1 + coefficient of variation of per-cell counts), 1 = perfectly even
    counts: np.ndarray  # (rows, cols) points per cell
    bounds: Bounds  # the area the grid covers, in reference pixels
    eligible: np.ndarray  # (rows, cols) bool: cells where a tie point was possible


def spatial_coverage(
    points: np.ndarray,
    image_shape: tuple[int, int],
    grid: tuple[int, int] = (8, 8),
    candidates: np.ndarray | None = None,
) -> CoverageReport:
    """How evenly points spread over the area where they could have been found.

    `candidates` are the positions a tie point could have been placed at: the
    grid points inside the overlap. Given them, the grid is laid over their
    bounding box and only cells holding a candidate count, so a pair that
    overlaps in one corner is judged on that corner instead of on the whole
    reference frame, where the rest is empty for a reason that is not an error.
    Without them the whole image is used, and every cell counts.
    """
    height, width = image_shape[:2]
    if candidates is not None and len(np.asarray(candidates).reshape(-1, 2)) == 0:
        candidates = None
    bounds = bounding_box(candidates) if candidates is not None else (0.0, 0.0, float(width), float(height))

    counts = cell_counts(points, bounds, grid)
    eligible = cell_counts(candidates, bounds, grid) > 0 if candidates is not None else np.ones(grid, dtype=bool)
    possible = int(eligible.sum())
    if possible == 0:
        return CoverageReport(0.0, 0.0, counts, bounds, eligible)

    within = counts[eligible]
    mean = within.mean()
    uniformity = 1.0 / (1.0 + within.std() / mean) if mean > 0 else 0.0
    return CoverageReport(
        coverage=float(np.count_nonzero(within) / possible),
        uniformity=float(uniformity),
        counts=counts,
        bounds=bounds,
        eligible=eligible,
    )


def pixels_to_metres(pixels: float, gsd: float | None) -> float | None:
    return None if gsd is None else float(pixels * gsd)
