"""Output products of a registration: images for inspection and per-cell error statistics."""

from __future__ import annotations

import cv2
import numpy as np

from .imaging import normalize_to_uint8


def overlay_image(reference: np.ndarray, registered: np.ndarray) -> np.ndarray:
    """False-colour overlay: reference in magenta, registered source in green, grey where they agree."""
    reference8 = normalize_to_uint8(reference)
    registered8 = normalize_to_uint8(registered)
    return cv2.merge([reference8, registered8, reference8])


def error_heatmap(
    reference: np.ndarray, points: np.ndarray, errors: np.ndarray, max_error: float = 2.0, cell: int = 40
) -> np.ndarray:
    """Held-out error at the tie points, interpolated and blended over the reference (BGR).

    Colour runs from blue (0 px) to red (`max_error` px or more).
    """
    height, width = reference.shape[:2]
    base = cv2.cvtColor(normalize_to_uint8(reference), cv2.COLOR_GRAY2BGR)
    points = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    errors = np.asarray(errors, dtype=np.float64)
    finite = np.isfinite(errors)
    if not finite.any():
        return base

    # Average errors on a coarse raster, then smooth-upsample to the image size.
    rows, cols = max(1, height // cell), max(1, width // cell)
    total = np.zeros((rows, cols))
    count = np.zeros((rows, cols))
    cy = np.clip((points[finite, 1] / height * rows).astype(int), 0, rows - 1)
    cx = np.clip((points[finite, 0] / width * cols).astype(int), 0, cols - 1)
    np.add.at(total, (cy, cx), errors[finite])
    np.add.at(count, (cy, cx), 1)
    mean = np.divide(total, count, out=np.zeros_like(total), where=count > 0)

    # Normalised convolution fills small gaps (e.g. tie points removed as outliers) from their neighbours;
    # cells more than `fill_cells` from any tie point stay uncoloured.
    fill_cells = 3
    known = (count > 0).astype(np.float32)
    blur = (2 * fill_cells + 1, 2 * fill_cells + 1)
    weight = cv2.GaussianBlur(known, blur, 0)
    smoothed = cv2.GaussianBlur(mean.astype(np.float32), blur, 0) / np.maximum(weight, 1e-6)
    distance = cv2.distanceTransform((known == 0).astype(np.uint8), cv2.DIST_L2, 3)
    coverage = distance <= fill_cells
    error_map = cv2.resize(smoothed, (width, height), interpolation=cv2.INTER_CUBIC)
    mask = cv2.resize(coverage.astype(np.uint8), (width, height), interpolation=cv2.INTER_NEAREST).astype(bool)

    colour = cv2.applyColorMap(np.clip(error_map / max_error * 255, 0, 255).astype(np.uint8), cv2.COLORMAP_JET)
    blended = cv2.addWeighted(base, 0.45, colour, 0.55, 0)
    output = base.copy()
    output[mask] = blended[mask]
    return output


def match_visualization(
    reference: np.ndarray,
    source: np.ndarray,
    reference_points: np.ndarray,
    source_points: np.ndarray,
    errors: np.ndarray,
    max_lines: int = 150,
    max_error: float = 2.0,
) -> np.ndarray:
    """Side-by-side reference | source with a spread-out subset of tie points joined by lines."""
    reference8 = cv2.cvtColor(normalize_to_uint8(reference), cv2.COLOR_GRAY2BGR)
    source8 = cv2.cvtColor(normalize_to_uint8(source), cv2.COLOR_GRAY2BGR)
    height = max(reference8.shape[0], source8.shape[0])
    canvas = np.zeros((height, reference8.shape[1] + source8.shape[1], 3), dtype=np.uint8)
    canvas[: reference8.shape[0], : reference8.shape[1]] = reference8
    canvas[: source8.shape[0], reference8.shape[1] :] = source8

    count = len(reference_points)
    chosen = np.linspace(0, count - 1, min(max_lines, count)).astype(int) if count else []
    offset = reference8.shape[1]
    for index in chosen:
        error = errors[index]
        good = np.isfinite(error) and error <= max_error / 2
        colour = (80, 220, 80) if good else (0, 165, 255)
        start = tuple(int(round(v)) for v in reference_points[index])
        end = (int(round(source_points[index][0])) + offset, int(round(source_points[index][1])))
        cv2.line(canvas, start, end, colour, 1, cv2.LINE_AA)
        cv2.circle(canvas, start, 4, colour, 1, cv2.LINE_AA)
        cv2.circle(canvas, end, 4, colour, 1, cv2.LINE_AA)
    return canvas


def cell_statistics(
    points: np.ndarray, errors: np.ndarray, image_shape: tuple[int, int], grid: tuple[int, int] = (8, 8)
) -> list[dict]:
    """Tie-point count and held-out RMSE for every cell of a rows x cols grid (row-major)."""
    height, width = image_shape[:2]
    rows, cols = grid
    points = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    errors = np.asarray(errors, dtype=np.float64)
    cy = np.clip((points[:, 1] / height * rows).astype(int), 0, rows - 1)
    cx = np.clip((points[:, 0] / width * cols).astype(int), 0, cols - 1)

    cells = []
    for row in range(rows):
        for col in range(cols):
            cell_errors = errors[(cy == row) & (cx == col)]
            cell_errors = cell_errors[np.isfinite(cell_errors)]
            cells.append(
                {
                    "row": row,
                    "col": col,
                    "tie_points": int(cell_errors.size),
                    "rmse_px": float(np.sqrt(np.mean(cell_errors**2))) if cell_errors.size else None,
                }
            )
    return cells
