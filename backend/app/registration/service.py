"""Runs a registration on two image files and writes the products for the API.

The response keeps the fields of the earlier SIFT endpoint (`matches`,
`transformation`, `metrics`, `quality_assessment`, image URLs) so existing
clients keep working, and adds an `engine` block with the full report. The
meaning of `metrics.rmse` changed: it is now the spatial-block hold-out RMSE of
sub-pixel tie points, not the error on the RANSAC inliers used for fitting.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.services.quality_assessment import assess_registration_quality

from .imaging import load_image, normalize_to_uint8
from .pipeline import RegistrationConfig, register, warp_to_reference
from .products import cell_statistics, error_heatmap, match_visualization, overlay_image

MAX_MATCHES_IN_RESPONSE = 300
CELL_GRID = (8, 8)
HEATMAP_MAX_ERROR_PX = 2.0


def _source_to_reference_homography(reference_points: np.ndarray, source_points: np.ndarray) -> list[list[float]]:
    H, _ = cv2.findHomography(source_points.astype(np.float64), reference_points.astype(np.float64), 0)
    return (H / H[2, 2]).tolist() if H is not None else np.eye(3).tolist()


def analyze_pair(
    reference_path: Path,
    source_path: Path,
    output_dir: Path,
    url_prefix: str,
    reference_gsd: float | None = None,
    source_gsd: float | None = None,
    config: RegistrationConfig | None = None,
) -> dict:
    """Register `source_path` onto `reference_path`, save images to `output_dir`, return the JSON result."""
    reference = load_image(reference_path)
    source = load_image(source_path)
    reference_gsd = reference_gsd or reference.metadata.get("gsd")
    source_gsd = source_gsd or source.metadata.get("gsd")

    result = register(reference.data, source.data, reference_gsd=reference_gsd, source_gsd=source_gsd, config=config)
    errors = result.holdout_errors
    finite_errors = errors[np.isfinite(errors)]

    output_dir.mkdir(parents=True, exist_ok=True)
    registered = warp_to_reference(source.data, result.mapping, reference.shape)
    images = {
        "registered_image": ("registered.png", normalize_to_uint8(registered)),
        "overlay_image": ("overlay.jpg", overlay_image(reference.data, registered)),
        "error_heatmap_image": ("error_heatmap.jpg", error_heatmap(reference.data, result.reference_points, errors, HEATMAP_MAX_ERROR_PX)),
        "inlier_matches_image": (
            "tie_points.jpg",
            match_visualization(reference.data, source.data, result.reference_points, result.source_points, errors),
        ),
    }
    urls = {}
    for key, (filename, image) in images.items():
        params = [cv2.IMWRITE_JPEG_QUALITY, 90] if filename.endswith(".jpg") else []
        cv2.imwrite(str(output_dir / filename), image, params)
        urls[key] = f"{url_prefix}/{filename}"

    cells = cell_statistics(result.reference_points, errors, reference.shape, CELL_GRID)
    tie_points = len(result.reference_points)
    metrics = {
        "rmse": result.holdout_rmse,
        "max_error": float(finite_errors.max()) if finite_errors.size else None,
        "inlier_count": tie_points,
        "inlier_ratio": tie_points / max(result.stats.get("grid_points", tie_points), 1),
        "spatial_coverage": result.coverage.coverage,
        "occupied_cells": [[cell["row"], cell["col"]] for cell in cells if cell["tie_points"]],
        "uniformity_score": result.coverage.uniformity,
    }

    shown = np.linspace(0, tie_points - 1, min(MAX_MATCHES_IN_RESPONSE, tie_points)).astype(int)
    matches = [
        {
            "source": [round(float(v), 3) for v in result.source_points[i]],
            "reference": [round(float(v), 3) for v in result.reference_points[i]],
            "distance": None if not np.isfinite(errors[i]) else round(float(errors[i]), 4),
        }
        for i in shown
    ]

    return {
        "matches": matches,
        "transformation": _source_to_reference_homography(result.reference_points, result.source_points),
        "metrics": metrics,
        "quality_assessment": assess_registration_quality(metrics),
        **urls,
        "engine": {
            **result.summary(),
            "reference_gsd": reference_gsd,
            "source_gsd": source_gsd,
            "reference_shape": list(reference.shape),
            "source_shape": list(source.shape),
            "cell_grid": list(CELL_GRID),
            "error_heatmap_scale_px": [0.0, HEATMAP_MAX_ERROR_PX],
            "cells": cells,
            "notes": {
                "rmse": "Spatial-block hold-out RMSE in reference pixels; each tie point is predicted by a model that never saw its block.",
                "matches.distance": "Held-out error of the tie point in reference pixels.",
                "transformation": "Least-squares source->reference homography of the tie points, for display only; the registration uses `model`.",
            },
        },
    }
