import numpy as np

from app.registration.metrics import holdout_rmse, pixels_to_metres, spatial_coverage


def _fit_affine(reference, source):
    design = np.column_stack([reference, np.ones(len(reference))])
    coefficients, *_ = np.linalg.lstsq(design, source, rcond=None)

    def predict(points):
        return np.column_stack([points, np.ones(len(points))]) @ coefficients

    return predict


def _fit_memorise(reference, source):
    """A model that reproduces its training points exactly but generalises badly."""

    def predict(points):
        nearest = np.argmin(((points[:, None, :] - reference[None, :, :]) ** 2).sum(-1), axis=1)
        return source[nearest]

    return predict


def test_holdout_matches_noise_level_for_correct_model(rng):
    reference = rng.uniform(0, 1000, (200, 2))
    matrix = np.array([[1.02, 0.03], [-0.03, 1.02]])
    source = reference @ matrix.T + (12.0, -7.0) + rng.normal(0, 0.3, (200, 2))

    report = holdout_rmse(reference, source, _fit_affine)

    # Isotropic per-axis noise of 0.3 px gives a 2-D error RMSE of 0.3 * sqrt(2) ~= 0.42 px.
    assert 0.3 < report.fit_rmse <= report.rmse < 0.6
    assert np.all(np.isfinite(report.errors))


def test_holdout_exposes_overfitting_that_fit_rmse_hides(rng):
    reference = rng.uniform(0, 1000, (200, 2))
    source = reference + rng.normal(0, 3.0, (200, 2))

    report = holdout_rmse(reference, source, _fit_memorise)

    assert report.fit_rmse == 0.0  # looks perfect on its own training points
    assert report.rmse > 20.0  # but fails on points it never saw


def test_grouped_holdout_catches_leak_between_neighbouring_points(rng):
    # Every tie point has near neighbours with the same local error, like a dense grid on real terrain.
    sites = rng.uniform(0, 1000, (60, 2))
    site_error = rng.normal(0, 3.0, (60, 2))
    reference = np.repeat(sites, 4, axis=0) + rng.normal(0, 0.5, (240, 2))
    source = reference + np.repeat(site_error, 4, axis=0)
    blocks = (reference[:, 1] // 250) * 4 + reference[:, 0] // 250

    def fit_local_offset(train_reference, train_source):
        """Copies the displacement of the nearest training point: a very local model."""

        def predict(points):
            nearest = np.argmin(((points[:, None, :] - train_reference[None, :, :]) ** 2).sum(-1), axis=1)
            return points + (train_source - train_reference)[nearest]

        return predict

    random_folds = holdout_rmse(reference, source, fit_local_offset)
    spatial_blocks = holdout_rmse(reference, source, fit_local_offset, groups=blocks)

    # Random folds leave a neighbour in the training set, which hides how badly the model generalises.
    assert spatial_blocks.rmse > 3.0
    assert random_folds.rmse * 4 < spatial_blocks.rmse
    assert spatial_blocks.folds == len(np.unique(blocks))


def test_spatial_coverage_even_versus_clumped():
    shape = (800, 800)
    centres = (np.arange(8) + 0.5) * 100
    gx, gy = np.meshgrid(centres, centres)
    even = spatial_coverage(np.column_stack([gx.ravel(), gy.ravel()]), shape)
    clumped = spatial_coverage(np.full((64, 2), 30.0), shape)

    assert even.coverage == 1.0 and even.uniformity == 1.0
    assert clumped.coverage == 1 / 64
    assert clumped.uniformity < 0.2


def test_pixels_to_metres():
    assert pixels_to_metres(0.5, 0.8878) == 0.4439
    assert pixels_to_metres(0.5, None) is None
