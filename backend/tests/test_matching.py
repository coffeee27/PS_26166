import cv2
import numpy as np

from app.registration.matching import balance_by_grid, match_features, robust_homography


def test_balance_by_grid_caps_each_cell_and_keeps_best():
    clump = np.column_stack([np.full(50, 10.0), np.full(50, 10.0)])
    lone = np.array([[790.0, 790.0]])
    points = np.vstack([clump, lone])
    priority = np.concatenate([np.arange(50, 0, -1), [99]]).astype(float)

    selected = balance_by_grid(points, (800, 800), grid=(4, 4), per_cell=5, priority=priority)

    assert len(selected) == 6
    assert 50 in selected  # the only point in its cell survives despite a poor priority
    assert set(selected[:5]) == set(range(45, 50))  # lowest priorities in the clump


def test_matches_recover_similarity_under_brightness_change(lunar_texture, rng):
    reference = lunar_texture
    height, width = reference.shape
    truth = cv2.getRotationMatrix2D((width / 2, height / 2), 8.0, 1.04)
    truth[:, 2] += (6.0, -4.0)
    source = cv2.warpAffine(reference, truth, (width, height), flags=cv2.INTER_CUBIC)
    source = source * 0.75 + 20 + rng.normal(0, 2, source.shape).astype(np.float32)

    matches = match_features(reference, source, scale=1.0)
    H, inliers = robust_homography(matches)

    assert inliers.sum() >= 40
    expected = matches.reference_points[inliers] @ truth[:, :2].T + truth[:, 2]
    assert np.median(np.hypot(*(matches.source_points[inliers] - expected).T)) < 0.5
