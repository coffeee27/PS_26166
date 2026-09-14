import numpy as np

from app.registration.geometry import mad_inliers, select_model

SHAPE = (1000, 1000)


def _grid(step=40):
    xs, ys = np.meshgrid(np.arange(20, 1000, step), np.arange(20, 1000, step))
    return np.column_stack([xs.ravel(), ys.ravel()]).astype(np.float64)


def _project(points, H):
    homogeneous = np.column_stack([points, np.ones(len(points))]) @ H.T
    return homogeneous[:, :2] / homogeneous[:, 2:]


def test_selects_homography_for_projective_data(rng):
    reference = _grid()
    H = np.array([[1.01, 0.02, 12.0], [-0.015, 0.99, -8.0], [2e-5, -1e-5, 1.0]])
    source = _project(reference, H) + rng.normal(0, 0.2, reference.shape)

    selection = select_model(reference, source, SHAPE)

    assert selection.name == "homography"
    assert selection.report.rmse < 0.4


def test_selects_polynomial_for_smooth_nonlinear_distortion(rng):
    reference = _grid()
    x, y = (reference / 1000.0).T
    source = reference + np.column_stack([6 * (x - 0.5) ** 2 - 3 * x * y, 4 * (y - 0.5) ** 3 + 2 * x**2])
    source += rng.normal(0, 0.2, reference.shape)

    selection = select_model(reference, source, SHAPE)

    assert selection.name.startswith("polynomial")
    assert selection.report.rmse < 0.4 < selection.reports["homography"].rmse


def test_mad_inliers_flags_gross_errors(rng):
    errors = np.abs(rng.normal(0, 0.5, 500))
    errors[:10] = 25.0
    keep = mad_inliers(errors)
    assert not keep[:10].any()
    assert keep[10:].mean() > 0.97
