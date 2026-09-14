import cv2
import numpy as np

from app.registration.subpixel import refine_correspondences


def _interior_grid(shape, margin=80, step=40):
    height, width = shape
    xs = np.arange(margin, width - margin, step, dtype=np.float64)
    ys = np.arange(margin, height - margin, step, dtype=np.float64)
    gx, gy = np.meshgrid(xs, ys)
    return np.column_stack([gx.ravel(), gy.ravel()])


def _affine_mapping(matrix):
    matrix = np.asarray(matrix, dtype=np.float64)

    def mapping(points):
        points = np.asarray(points, dtype=np.float64)
        return points @ matrix[:, :2].T + matrix[:, 2]

    return mapping


def test_refines_translation_to_subpixel_under_brightness_change(lunar_texture, rng):
    reference = lunar_texture
    true_shift = np.array([2.37, -1.62])
    height, width = reference.shape
    # source(q + d) = reference(q): the reference content moved by +d
    source = cv2.warpAffine(
        reference, np.float32([[1, 0, true_shift[0]], [0, 1, true_shift[1]]]), (width, height), flags=cv2.INTER_CUBIC
    )
    source = source * 0.7 + 25 + rng.normal(0, 3, source.shape).astype(np.float32)

    points = _interior_grid(reference.shape)
    identity = _affine_mapping([[1, 0, 0], [0, 1, 0]])  # coarse model is off by ~2.9 px

    result = refine_correspondences(reference, source, points, identity)

    errors = np.hypot(*(result.source_points[result.valid] - (points[result.valid] + true_shift)).T)
    assert result.valid.mean() > 0.8
    assert errors.mean() < 0.1
    assert np.percentile(errors, 90) < 0.2


def test_refines_similarity_when_coarse_model_is_slightly_wrong(lunar_texture, rng):
    reference = lunar_texture
    height, width = reference.shape
    angle, scale = 6.0, 1.05
    truth = cv2.getRotationMatrix2D((width / 2, height / 2), angle, scale)
    truth[:, 2] += (4.3, -2.8)
    source = cv2.warpAffine(reference, truth, (width, height), flags=cv2.INTER_CUBIC)
    source = source * 0.8 + 10 + rng.normal(0, 2, source.shape).astype(np.float32)

    coarse = cv2.getRotationMatrix2D((width / 2, height / 2), angle + 0.4, scale)
    coarse[:, 2] += (4.3 + 1.2, -2.8 - 0.8)

    points = _interior_grid(reference.shape)
    result = refine_correspondences(reference, source, points, _affine_mapping(coarse))

    truth_points = _affine_mapping(truth)(points)
    coarse_errors = np.hypot(*(_affine_mapping(coarse)(points) - truth_points).T)
    refined_errors = np.hypot(*(result.source_points[result.valid] - truth_points[result.valid]).T)

    assert result.valid.mean() > 0.7
    assert coarse_errors.mean() > 1.0
    assert refined_errors.mean() < 0.15


def test_rejects_featureless_patches():
    flat = np.full((200, 200), 120.0, dtype=np.float32)
    identity = _affine_mapping([[1, 0, 0], [0, 1, 0]])
    result = refine_correspondences(flat, flat, np.array([[100.0, 100.0]]), identity)
    assert not result.valid[0]
