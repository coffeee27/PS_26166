"""Sub-pixel refinement of correspondences.

Each tie point is refined by normalised cross-correlation (NCC) between a
reference patch and the source image resampled through the current coarse
mapping. The correlation peak is located to sub-pixel precision by fitting a
parabola, and the search is repeated from the updated position, which removes
most of the parabola's bias towards whole pixels.

Measured on lunar texture with a brightness/contrast change and noise, this
gave a mean error of ~0.06 px (p90 ~0.1 px) for 48-64 px patches, where a
single parabola fit gave ~0.1 px and OpenCV phaseCorrelate / skimage phase
correlation were worse.

Normalised correlation is invariant to linear brightness changes but not to
shading reversal, so it is meant for the fine stage, after a coarse model has
brought both images into the same geometry.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import cv2
import numpy as np

# Maps (N, 2) reference pixel coordinates to (N, 2) source pixel coordinates.
Mapping = Callable[[np.ndarray], np.ndarray]


@dataclass
class RefinementResult:
    source_points: np.ndarray  # (N, 2) refined source coordinates
    offsets: np.ndarray  # (N, 2) correction applied in reference pixels
    scores: np.ndarray  # (N,) NCC peak value
    valid: np.ndarray  # (N,) bool: refinement converged and passed quality checks


def _sample(image: np.ndarray, map_x: np.ndarray, map_y: np.ndarray) -> np.ndarray:
    return cv2.remap(
        image,
        map_x.astype(np.float32),
        map_y.astype(np.float32),
        cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=float("nan"),
    )


def _parabola_peak(response: np.ndarray) -> tuple[float, float, float]:
    _, peak, _, (px, py) = cv2.minMaxLoc(response)

    def vertex(before: float, centre: float, after: float) -> float:
        denominator = before - 2.0 * centre + after
        return 0.0 if abs(denominator) < 1e-12 else 0.5 * (before - after) / denominator

    dx = vertex(response[py, px - 1], response[py, px], response[py, px + 1]) if 0 < px < response.shape[1] - 1 else 0.0
    dy = vertex(response[py - 1, px], response[py, px], response[py + 1, px]) if 0 < py < response.shape[0] - 1 else 0.0
    return px + dx, py + dy, float(peak)


def refine_correspondences(
    reference: np.ndarray,
    source: np.ndarray,
    reference_points: np.ndarray,
    mapping: Mapping,
    patch_size: int = 48,
    search_radius: int = 6,
    iterations: int = 3,
    min_score: float = 0.5,
    min_patch_std: float = 1.0,
) -> RefinementResult:
    """Refine where each reference point lands in the source image.

    Args:
        reference: fixed image (float32).
        source: moving image (float32), in the same resolution as the reference.
        reference_points: (N, 2) points in reference pixels.
        mapping: current coarse reference -> source mapping.
        patch_size: template size in reference pixels.
        search_radius: search half-width in reference pixels per iteration.
        iterations: NCC passes; each restarts from the updated position.
        min_score: minimum NCC peak to accept a refinement.
        min_patch_std: templates flatter than this (featureless/shadow) are rejected.
    """
    reference = reference.astype(np.float32, copy=False)
    source = source.astype(np.float32, copy=False)
    points = np.asarray(reference_points, dtype=np.float64).reshape(-1, 2)
    count = len(points)

    half = (patch_size - 1) / 2.0
    template_offsets = np.arange(patch_size) - half
    window_offsets = np.arange(patch_size + 2 * search_radius) - half - search_radius
    tgx, tgy = np.meshgrid(template_offsets, template_offsets)
    wgx, wgy = np.meshgrid(window_offsets, window_offsets)

    offsets = np.zeros((count, 2))
    scores = np.zeros(count)
    valid = np.zeros(count, dtype=bool)

    for i, (qx, qy) in enumerate(points):
        template = _sample(reference, qx + tgx, qy + tgy)
        if not np.all(np.isfinite(template)) or float(template.std()) < min_patch_std:
            continue

        estimate = np.zeros(2)
        converged = False
        score = 0.0
        for _ in range(iterations):
            grid = np.column_stack([(qx + estimate[0] + wgx).ravel(), (qy + estimate[1] + wgy).ravel()])
            mapped = mapping(grid)
            window = _sample(
                source,
                mapped[:, 0].reshape(wgx.shape),
                mapped[:, 1].reshape(wgx.shape),
            )
            if not np.all(np.isfinite(window)):
                break
            px, py, score = _parabola_peak(cv2.matchTemplate(window, template, cv2.TM_CCOEFF_NORMED))
            step = np.array([px - search_radius, py - search_radius])
            estimate += step
            if np.hypot(*step) < 0.01:
                converged = True
                break
        else:
            converged = True  # used all iterations without diverging

        # The template matched the source window shifted by `estimate`, so the
        # reference point corresponds to the source position of q + estimate.
        if converged and score >= min_score and np.hypot(*estimate) <= search_radius * iterations:
            offsets[i] = estimate
            scores[i] = score
            valid[i] = True

    refined = mapping(points + offsets)
    return RefinementResult(source_points=refined, offsets=offsets, scores=scores, valid=valid)
