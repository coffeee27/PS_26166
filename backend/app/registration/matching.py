"""Coarse feature matching between reference and source images.

The coarse stage only has to bring the images within a few pixels of each
other; sub-pixel accuracy comes from NCC refinement afterwards. Matching is
therefore done on downsampled images, which on a 2000x2000 lunar pair is ~10x
faster than full resolution with no loss in final accuracy.

Pipeline: percentile stretch -> SIFT (no feature cap) -> RootSIFT descriptors
(Arandjelovic & Zisserman, 2012) -> FLANN k-NN with Lowe's ratio test and a
mutual-nearest check -> MAGSAC++ homography (Barath et al., 2020, OpenCV
USAC_MAGSAC) -> grid balancing so dense regions do not dominate the model.

Capping SIFT at a few thousand features or using a strict ratio (0.65) keeps
only a few dozen matches on lunar terrain, clustered in one part of the image;
both are avoided here.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from .imaging import normalize_to_uint8


@dataclass
class MatchSet:
    reference_points: np.ndarray  # (N, 2) full-resolution reference pixels
    source_points: np.ndarray  # (N, 2) full-resolution source pixels
    distances: np.ndarray  # (N,) descriptor distance ratio to the second-best match, lower is better


def _root_sift(descriptors: np.ndarray) -> np.ndarray:
    descriptors = descriptors / (np.abs(descriptors).sum(axis=1, keepdims=True) + 1e-7)
    return np.sqrt(descriptors).astype(np.float32)


def _prepare(image: np.ndarray, scale: float) -> np.ndarray:
    image8 = normalize_to_uint8(image, 1.0, 99.0)
    if scale != 1.0:
        image8 = cv2.resize(image8, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return image8


def match_features(
    reference: np.ndarray,
    source: np.ndarray,
    scale: float = 0.5,
    ratio: float = 0.8,
    mutual: bool = True,
    max_features: int = 0,
) -> MatchSet:
    """Putative SIFT correspondences between two images of the same ground resolution.

    Args:
        scale: resampling factor applied before detection (0.5 = half resolution).
        ratio: Lowe ratio threshold.
        mutual: keep a match only if it is also the best match in the reverse direction.
        max_features: SIFT feature cap per image; 0 keeps all.
    """
    sift = cv2.SIFT_create(nfeatures=max_features)
    reference_kp, reference_desc = sift.detectAndCompute(_prepare(reference, scale), None)
    source_kp, source_desc = sift.detectAndCompute(_prepare(source, scale), None)
    empty = MatchSet(np.empty((0, 2)), np.empty((0, 2)), np.empty(0))
    if reference_desc is None or source_desc is None or len(reference_kp) < 2 or len(source_kp) < 2:
        return empty

    reference_desc, source_desc = _root_sift(reference_desc), _root_sift(source_desc)
    matcher = cv2.FlannBasedMatcher({"algorithm": 1, "trees": 4}, {"checks": 64})
    forward = matcher.knnMatch(reference_desc, source_desc, k=2)

    kept = [(pair[0], pair[0].distance / max(pair[1].distance, 1e-12)) for pair in forward if len(pair) == 2]
    kept = [(match, score) for match, score in kept if score < ratio]
    if mutual and kept:
        backward = {pair[0].queryIdx: pair[0].trainIdx for pair in matcher.knnMatch(source_desc, reference_desc, k=1) if pair}
        kept = [(match, score) for match, score in kept if backward.get(match.trainIdx) == match.queryIdx]
    if not kept:
        return empty

    # Keypoints are in downsampled pixels; convert with the pixel-centre convention.
    reference_points = (np.float64([reference_kp[m.queryIdx].pt for m, _ in kept]) + 0.5) / scale - 0.5
    source_points = (np.float64([source_kp[m.trainIdx].pt for m, _ in kept]) + 0.5) / scale - 0.5
    return MatchSet(reference_points, source_points, np.float64([score for _, score in kept]))


MIN_CONSISTENT_MATCHES = 20
"""Unrelated lunar images still produce up to ~10 matches that agree by chance, so fewer than this is rejected."""

_PAIR_HINT = (
    "The two images may not show the same area, may overlap too little, "
    "or may differ too much in lighting or scale. Try images of the same site with similar sun angle and known pixel size."
)


def robust_homography(
    matches: MatchSet, threshold: float = 3.0, min_inliers: int = MIN_CONSISTENT_MATCHES
) -> tuple[np.ndarray, np.ndarray]:
    """MAGSAC++ reference -> source homography and the inlier mask.

    Raises ValueError with a user-facing explanation when too few matches agree
    on one alignment, instead of returning a registration built on chance matches.
    """
    found = len(matches.reference_points)
    if found < min_inliers:
        raise ValueError(
            f"Only {found} matching features were found between the two images "
            f"(at least {min_inliers} are needed). {_PAIR_HINT}"
        )
    H, mask = cv2.findHomography(
        matches.reference_points, matches.source_points, cv2.USAC_MAGSAC, threshold, maxIters=10000, confidence=0.9999
    )
    consistent = 0 if mask is None else int(mask.sum())
    if H is None or consistent < min_inliers:
        raise ValueError(
            f"Found {found} candidate matches, but only {consistent} agree on one alignment "
            f"(at least {min_inliers} are needed). {_PAIR_HINT}"
        )
    return H, mask.ravel().astype(bool)


def balance_by_grid(
    points: np.ndarray, image_shape: tuple[int, int], grid: tuple[int, int] = (8, 8), per_cell: int = 25,
    priority: np.ndarray | None = None,
) -> np.ndarray:
    """Indices of at most `per_cell` points per grid cell, best `priority` (lowest) first."""
    height, width = image_shape[:2]
    rows, cols = grid
    points = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    order = np.argsort(priority, kind="stable") if priority is not None else np.arange(len(points))
    cell_x = np.clip((points[order, 0] / width * cols).astype(int), 0, cols - 1)
    cell_y = np.clip((points[order, 1] / height * rows).astype(int), 0, rows - 1)
    counts = np.zeros((rows, cols), dtype=int)
    selected = []
    for index, cy, cx in zip(order, cell_y, cell_x):
        if counts[cy, cx] < per_cell:
            counts[cy, cx] += 1
            selected.append(index)
    return np.sort(np.asarray(selected, dtype=int))
