import numpy as np
import tifffile

from app.registration.imaging import Resampling, load_image, normalize_to_uint8, resample_to_gsd


def test_16bit_tiff_keeps_full_dynamic_range(tmp_path):
    data = np.linspace(0, 4095, 64 * 48).round().reshape(48, 64).astype(np.uint16)  # 12-bit range
    path = tmp_path / "strip.tif"
    tifffile.imwrite(path, data)

    image = load_image(path)

    assert image.source_dtype == "uint16"
    assert image.data.dtype == np.float32
    assert image.data.max() == 4095  # an 8-bit read would have clipped this to 255
    np.testing.assert_array_equal(image.data, data.astype(np.float32))


def test_normalize_to_uint8_stretches_percentiles():
    data = np.linspace(1000, 3000, 10000, dtype=np.float32).reshape(100, 100)
    out = normalize_to_uint8(data, 0, 100)
    assert out.dtype == np.uint8
    assert out.min() == 0 and out.max() == 255


def test_resampling_coordinate_round_trip():
    resampling = Resampling(scale_x=0.25, scale_y=0.25)
    points = np.array([[0.0, 0.0], [120.3, 80.7], [399.5, 319.5]])
    np.testing.assert_allclose(resampling.to_native(resampling.to_resampled(points)), points, atol=1e-9)


def test_resample_to_gsd_preserves_subpixel_feature_position():
    # A blob at a known sub-pixel position must land where Resampling predicts
    # after shrinking a 0.25 m image to 1 m.
    height, width = 320, 400
    cx, cy, sigma = 120.3, 80.7, 6.0
    yy, xx = np.mgrid[0:height, 0:width]
    image = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * sigma**2)).astype(np.float32)

    resampled, resampling = resample_to_gsd(image, source_gsd=0.25, target_gsd=1.0)

    assert resampled.shape == (80, 100)
    ry, rx = np.mgrid[0 : resampled.shape[0], 0 : resampled.shape[1]]
    weights = resampled / resampled.sum()
    centroid = np.array([(rx * weights).sum(), (ry * weights).sum()])
    expected = resampling.to_resampled(np.array([[cx, cy]]))[0]
    assert np.hypot(*(centroid - expected)) < 0.05
