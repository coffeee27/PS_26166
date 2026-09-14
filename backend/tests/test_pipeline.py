import cv2
import numpy as np

from app.registration.pipeline import RegistrationConfig, register, warp_to_reference


def _source_to_reference(points, height, width):
    """Smooth non-projective distortion: source pixel -> reference pixel."""
    x, y = points[:, 0], points[:, 1]
    u, v = x / width - 0.5, y / height - 0.5
    ref_x = 0.98 * x + 0.03 * y + 6.0 + 5.0 * u**2
    ref_y = -0.02 * x + 1.01 * y - 4.0 + 4.0 * u * v
    return np.column_stack([ref_x, ref_y])


def test_register_reaches_subpixel_on_distorted_scene(lunar_texture, rng):
    reference = lunar_texture
    height, width = reference.shape
    gx, gy = np.meshgrid(np.arange(width, dtype=np.float64), np.arange(height, dtype=np.float64))
    mapped = _source_to_reference(np.column_stack([gx.ravel(), gy.ravel()]), height, width)
    source = cv2.remap(
        reference, mapped[:, 0].reshape(gx.shape).astype(np.float32), mapped[:, 1].reshape(gx.shape).astype(np.float32),
        cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT,
    )
    source = source * 0.8 + 15 + rng.normal(0, 2, source.shape).astype(np.float32)

    config = RegistrationConfig(match_scale=1.0, grid_step=24, min_tie_points=30)
    result = register(reference, source, config=config)

    # The recovered source position of each reference pixel must map back onto itself.
    xs, ys = np.meshgrid(np.arange(60, width - 60, 20.0), np.arange(60, height - 60, 20.0))
    query = np.column_stack([xs.ravel(), ys.ravel()])
    errors = np.hypot(*(_source_to_reference(result.mapping(query), height, width) - query).T)

    assert result.coverage.coverage > 0.9
    assert np.mean(errors) < 0.2
    assert result.holdout_rmse < 0.3

    warped = warp_to_reference(source, result.mapping, reference.shape)
    inner = (slice(40, height - 40), slice(40, width - 40))
    correlation = np.corrcoef(warped[inner].ravel(), reference[inner].ravel())[0, 1]
    assert correlation > 0.95


def test_resamples_source_to_reference_resolution(lunar_texture):
    reference = lunar_texture
    height, width = reference.shape
    # A source at twice the ground resolution (0.5 m vs 1 m), shifted by 3 reference pixels.
    source = cv2.resize(reference, (width * 2, height * 2), interpolation=cv2.INTER_CUBIC)
    source = np.roll(source, (6, -6), axis=(0, 1))

    config = RegistrationConfig(match_scale=1.0, min_tie_points=30)
    result = register(reference, source, reference_gsd=1.0, source_gsd=0.5, config=config)

    query = np.array([[150.0, 200.0], [300.0, 260.0]])
    expected = (query + np.array([-3.0, 3.0]) + 0.5) * 2 - 0.5
    assert np.allclose(result.mapping(query), expected, atol=0.3)
    assert result.holdout_rmse_m is not None and result.holdout_rmse_m < 0.3


def test_lattice_mapping_reproduces_smooth_mapping():
    from app.registration.pipeline import lattice_mapping

    def mapping(points):
        x, y = points.T
        return np.column_stack([x + 3 * np.sin(x / 90.0), y + 0.002 * x * y / 10])

    fast = lattice_mapping(mapping, (500, 560), step=4.0, margin=40.0)
    rng = np.random.default_rng(3)
    points = np.column_stack([rng.uniform(-40, 600, 5000), rng.uniform(-40, 540, 5000)])  # inside the lattice
    assert np.abs(fast(points) - mapping(points)).max() < 0.01


def test_partial_overlap_restricts_tie_points_and_scales_coarse_matching(lunar_texture):
    reference = lunar_texture
    height, width = reference.shape
    # The source covers only the right ~70% of the reference.
    shift = np.float32([[1, 0, -150.0], [0, 1, 4.0]])
    source = cv2.warpAffine(reference, shift, (width - 150, height), flags=cv2.INTER_CUBIC)

    config = RegistrationConfig(match_max_side=250, grid_step=24, min_tie_points=30)
    result = register(reference, source, config=config)

    assert result.stats["match_scale"] == round(250 / max(width, height), 4)  # below the default 0.5
    assert 0.5 < result.stats["overlap_fraction"] < 0.8
    assert result.reference_points[:, 0].min() >= 150  # nothing refined where the source has no pixels
    query = np.array([[300.0, 200.0], [450.0, 300.0]])
    assert np.allclose(result.mapping(query), query + np.array([-150.0, 4.0]), atol=0.2)
