import numpy as np
import pytest

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


def test_local_model_captures_scarps_that_polynomials_miss(rng):
    reference = _grid()
    x, y = reference.T
    # Sharp slope breaks crossing the frame, like relief displacement along scarps.
    scarps = np.column_stack([1.2 * np.tanh((x - 350) / 30) - 1.2 * np.tanh((x - 700) / 30), 0.6 * np.tanh((y - 600) / 30)])
    source = reference + np.array([4.0, -2.0]) + scarps + rng.normal(0, 0.1, reference.shape)

    selection = select_model(reference, source, SHAPE)

    best_global = min(report.rmse for name, report in selection.reports.items() if not name.endswith("+local"))
    assert selection.name == "polynomial-4+local"
    assert selection.report.rmse < 0.95 * best_global


def test_isolated_bump_inside_one_block_does_not_justify_local_model(rng):
    reference = _grid()
    x, y = reference.T
    bump = 3.0 * np.exp(-((x - 620) ** 2 + (y - 380) ** 2) / (2 * 90.0**2))
    source = reference + np.column_stack([4.0 + bump, np.full_like(bump, -2.0)]) + rng.normal(0, 0.1, reference.shape)

    # Held-out blocks cannot predict a feature with no neighbours, so hold-out keeps the simple model.
    assert select_model(reference, source, SHAPE).name != "polynomial-4+local"


def test_local_model_stays_within_measured_residuals_far_from_data():
    from app.registration.geometry import grid_residual_fitter, polynomial_fitter

    reference = _grid()
    source = reference + np.where(reference[:, :1] < 500, 1.0, -1.0)  # residual field between -1 and +1 px
    predict = grid_residual_fitter(polynomial_fitter(1))(reference, source)
    far = np.array([[-800.0, -800.0], [1800.0, 1800.0], [500.0, 2500.0]])
    global_part = polynomial_fitter(1)(reference, source)(far)

    assert np.all(np.abs(predict(far) - global_part) <= 2.0 + 1e-6)


def test_local_model_needs_regular_grid(rng):
    from app.registration.geometry import grid_residual_fitter, polynomial_fitter

    reference = rng.uniform(0, 1000, (200, 2))
    with pytest.raises(ValueError):
        grid_residual_fitter(polynomial_fitter(2))(reference, reference + 1.0)
