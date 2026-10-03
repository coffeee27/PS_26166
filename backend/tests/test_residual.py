import cv2
import numpy as np
import pytest

from app.registration.residual import residual_check, window_shift


def _shift(image: np.ndarray, dx: float, dy: float) -> np.ndarray:
    """Move the image content by (dx, dy) with cubic interpolation, so result(x) == image(x - d).

    This is how an aligned image is really produced, so it is what the whole-image
    tests use. It carries the interpolator's own ~0.13 px of phase error, which is
    why `_exact_shift` exists for the precision test.
    """
    matrix = np.float32([[1, 0, dx], [0, 1, dy]])
    height, width = image.shape
    return cv2.warpAffine(image, matrix, (width, height), flags=cv2.INTER_CUBIC)


def _exact_shift(image: np.ndarray, dx: float, dy: float) -> np.ndarray:
    """Band-limited shift by a phase ramp, so the ground truth is exact by construction."""
    height, width = image.shape
    fy, fx = np.fft.fftfreq(height)[:, None], np.fft.fftfreq(width)[None, :]
    ramp = np.exp(-2j * np.pi * (fy * dy + fx * dx))
    return np.real(np.fft.ifft2(np.fft.fft2(image.astype(np.float64)) * ramp))


def test_window_shift_recovers_an_exact_known_subpixel_shift(lunar_texture):
    """Against a phase-exact shift the estimator is good to a few hundredths of a pixel."""
    truth = np.array([0.63, -0.41])
    moved = _exact_shift(lunar_texture, *truth)
    box = (slice(200, 264), slice(200, 264))

    measured, sharpness = window_shift(lunar_texture[box].astype(np.float64), moved[box])

    assert np.allclose(measured, truth, atol=0.05)
    assert sharpness > 4.0


def test_cubic_resampling_sets_the_accuracy_floor_not_the_estimator(lunar_texture):
    """The error on a cubic-resampled image is the interpolator's, and it stays well under tau."""
    truth = np.array([0.63, -0.41])
    box = (slice(200, 264), slice(200, 264))
    reference = lunar_texture[box].astype(np.float64)

    exact, _ = window_shift(reference, _exact_shift(lunar_texture, *truth)[box])
    cubic, _ = window_shift(reference, _shift(lunar_texture, *truth)[box].astype(np.float64))

    assert np.hypot(*(exact - truth)) < 0.05
    assert np.hypot(*(cubic - truth)) < 0.25  # the documented ~0.13 px floor, with room
    assert np.hypot(*(cubic - truth)) > np.hypot(*(exact - truth))


def test_window_shift_is_unchanged_by_a_brightness_and_contrast_change(lunar_texture, rng):
    truth = np.array([1.35, 0.72])
    moved = _shift(lunar_texture, *truth) * 0.55 + 40
    box = (slice(180, 244), slice(220, 284))

    measured, _ = window_shift(lunar_texture[box], moved[box])

    assert np.allclose(measured, truth, atol=0.15)


def test_a_correct_mapping_leaves_almost_no_residual(lunar_texture):
    report = residual_check(lunar_texture, lunar_texture.copy(), window=64, step=64)

    assert report.measured.sum() >= 20
    assert report.aligned == 1.0
    assert report.median_px < 0.05
    assert report.systematic_px < 0.05


def test_a_mapping_that_is_biased_everywhere_is_caught(lunar_texture):
    """The failure PROVE exists for: a consistent mistake that self-grading would miss."""
    biased = _shift(lunar_texture, 2.5, -1.8)

    report = residual_check(lunar_texture, biased, window=64, step=64)

    assert report.aligned == 0.0  # no window is within tau
    assert report.systematic_px > 2.5  # and the error points one way, so it is a bias, not noise
    assert np.allclose(np.median(report.shifts[report.measured], axis=0), [2.5, -1.8], atol=0.2)


def test_random_leftover_error_is_not_reported_as_a_bias(lunar_texture, rng):
    """Per-window jitter with no preferred direction must leave systematic_px near zero."""
    height, width = lunar_texture.shape
    jittered = np.empty_like(lunar_texture)
    for top in range(0, height, 64):  # each band pushed a different way
        dx, dy = rng.normal(0, 1.5, 2)
        band = _shift(lunar_texture, dx, dy)
        jittered[top : top + 64] = band[top : top + 64]

    report = residual_check(lunar_texture, jittered, window=64, step=64)

    assert report.median_px > 0.5  # the jitter is seen
    assert report.systematic_px < report.median_px  # but it does not point one way


def test_windows_without_data_or_texture_are_not_measured(lunar_texture):
    aligned = lunar_texture.copy()
    aligned[:128] = np.nan  # outside the source footprint
    aligned[128:256] = 100.0  # flat, no phase to measure

    report = residual_check(lunar_texture, aligned, window=64, step=64)

    top = report.centres[:, 1] < 256
    assert not report.measured[top].any()
    assert report.measured[~top].any()
    assert any("could not be measured" in note for note in report.limits)


def test_report_states_what_it_could_not_check(lunar_texture):
    report = residual_check(lunar_texture, lunar_texture.copy(), window=64, step=96)

    summary = report.summary()
    assert summary["aligned"] == 1.0
    assert any("Sun factor" in note for note in summary["limits"])
    assert any("wrap around" in note for note in summary["limits"])


def test_mismatched_grids_and_bad_windows_are_refused(lunar_texture):
    with pytest.raises(ValueError, match="same grid"):
        residual_check(lunar_texture, lunar_texture[:-10])
    with pytest.raises(ValueError, match="even and at least"):
        residual_check(lunar_texture, lunar_texture.copy(), window=63)
    with pytest.raises(ValueError, match="too small"):
        residual_check(lunar_texture[:40, :40], lunar_texture[:40, :40].copy(), window=64)
