import cv2
import numpy as np


def verify_matches(source_points, 
                   reference_points, 
                   good_matches, 
                   image_shape, 
                   source_keypoints
                   ):
    """
    Verify feature matches using RANSAC.

    Returns:
        H: estimated homography
        inlier_matches: geometrically consistent matches
        metrics: geometric verification metrics
    """

    if len(good_matches) < 4:
        raise ValueError("At least 4 matches are required for homography estimation")

    H, mask = cv2.findHomography(
        source_points,
        reference_points,
        cv2.RANSAC,
        5.0
    )

    if H is None or mask is None:
        raise ValueError("Could not estimate transformation")

    inlier_mask = mask.ravel().astype(bool)

    inlier_matches = [
        match
        for match, inlier in zip(good_matches, inlier_mask)
        if inlier
    ]

    inlier_count = len(inlier_matches)

    inlier_ratio = (
        inlier_count / len(good_matches)
        if good_matches
        else 0
    )

    # Calculate registration error
    src_inliers = source_points[inlier_mask]
    ref_inliers = reference_points[inlier_mask]

    projected = cv2.perspectiveTransform(src_inliers, H)

    rmse = float(
        np.sqrt(
            np.mean(
                np.sum((projected - ref_inliers) ** 2, axis=2)
            )
        )
    )

    errors = np.sqrt(
    np.sum((projected - ref_inliers) ** 2, axis=2)
)

    max_error = float(np.max(errors))


    # Spatial distribution of inlier matches
    h, w = image_shape[:2]

    grid_rows = 4
    grid_cols = 4
    grid = np.zeros((grid_rows, grid_cols), dtype=int)

    for match in inlier_matches:
        x, y = source_keypoints[match.queryIdx].pt
        col = min(int(x / w * grid_cols), grid_cols - 1)
        row = min(int(y / h * grid_rows), grid_rows - 1)
        grid[row, col] += 1

    occupied_cells = np.count_nonzero(grid)
    occupied_cell_indices = np.argwhere(grid > 0).tolist()
    total_cells = grid_rows * grid_cols

    spatial_coverage = occupied_cells / total_cells

    cell_counts = grid.flatten()

    if np.mean(cell_counts) > 0:
        coefficient_variation = (
            np.std(cell_counts) / np.mean(cell_counts)
        )
        uniformity_score = 1 / (1 + coefficient_variation)
    else:
        coefficient_variation = 0
        uniformity_score = 0

    return H, inlier_matches, {
        "rmse": rmse,
        "max_error": max_error,
        "inlier_count": inlier_count,
        "inlier_ratio": inlier_ratio,
        "spatial_coverage": spatial_coverage,
        "occupied_cells": occupied_cell_indices,
        "uniformity_score": uniformity_score
    }