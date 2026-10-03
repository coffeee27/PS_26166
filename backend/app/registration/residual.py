"""Independent residual check: PROVE's second factor.

ALIGN reports its accuracy from the tie points it chose itself. If its matcher
made the same mistake everywhere, locking onto a shadow edge instead of a crater
rim, those points still agree with each other, so the reported error stays small
while the images remain misaligned. This module measures the leftover
misalignment again, from the pixels. It is given only the reference image and the
aligned image the claimed mapping produced. It never receives ALIGN's matches,
its model, its scores or its tie-point grid, so it cannot inherit that mistake.

Method. A lattice of windows is laid over the reference, placed by this module
and unrelated to where ALIGN put its tie points. Each window pair is compared by
phase correlation: the cross-power spectrum of the two windows with its magnitude
divided out, so only the phase carries the shift. A translation of d becomes a
linear phase ramp whose inverse transform is a peak at d, located to sub-pixel
precision by evaluating the transform on a fine grid around that peak instead of
upsampling the whole window (Guizar-Sicairos, Thurman & Fienup, 2008).

Why this is a second measurement and not the first one repeated. ALIGN's fine
stage maximises normalised cross-correlation in the spatial domain, which weights
whatever is brightest and highest in contrast, and on the Moon that is often a
shadow edge. Dividing the magnitude out weights every spatial frequency equally
instead, so an alignment held up by one strong edge does not survive here.

Measured accuracy, on lunar texture shifted by a known amount. Against an exact
band-limited shift the per-window estimate is accurate to a mean of 0.020 px
(p90 0.032 px), with no direction bias. Against an image resampled by OpenCV
cubic interpolation it reads 0.124 px, and that difference is the interpolator's
own phase error, not this estimator's: an aligned image is produced by cubic
resampling too, so expect a floor of roughly 0.13 px on a pair that is in truth
perfectly registered. The check is looking for residuals of about a pixel, so a
floor 8x below that leaves plenty of room, but it is why a report never reads
exactly zero.

What it cannot see. It reads the same two images, so a feature that genuinely
moved on the ground between the two acquisitions, above all a shadow under a
different Sun, moves for this check too: a residual reported here is a shift, not
yet a cause. Separating the two needs the Sun factor, which renders the height
map at each image's Sun angle. `ResidualReport.limits` states that rather than
leaving it implied.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

TAU_PX = 1.0
"""A window counts as aligned when its measured residual is at most this, in reference pixels."""

MIN_SHARPNESS = 4.0
"""Peak-to-sidelobe ratio below this means the phase peak is not distinct enough to believe."""

MIN_STD = 1.0
"""Windows flatter than this in either image carry no usable phase."""


@dataclass
class ResidualReport:
    """Per-window residual misalignment under a claimed mapping."""

    centres: np.ndarray  # (N, 2) window centres in reference pixels
    shifts: np.ndarray  # (N, 2) residual (dx, dy): where aligned content sits relative to the reference; NaN if unmeasured
    sharpness: np.ndarray  # (N,) peak-to-sidelobe ratio of the phase peak
    measured: np.ndarray  # (N,) bool: window had data, texture and a distinct peak
    window: int  # window side in reference pixels
    tau_px: float

    @property
    def magnitudes(self) -> np.ndarray:
        """(N,) residual distance per window; NaN where unmeasured."""
        return np.hypot(self.shifts[:, 0], self.shifts[:, 1])

    @property
    def aligned(self) -> float | None:
        """Share of measured windows whose residual is within `tau_px`. None when nothing could be measured."""
        if not self.measured.any():
            return None
        return float((self.magnitudes[self.measured] <= self.tau_px).mean())

    @property
    def median_px(self) -> float | None:
        return None if not self.measured.any() else float(np.median(self.magnitudes[self.measured]))

    @property
    def p90_px(self) -> float | None:
        return None if not self.measured.any() else float(np.percentile(self.magnitudes[self.measured], 90))

    @property
    def systematic_px(self) -> float | None:
        """Length of the median residual vector.

        Random leftover error cancels and leaves this near zero. A matcher that
        made the same mistake across the image leaves it large, which is the
        failure this factor exists to catch.
        """
        if not self.measured.any():
            return None
        return float(np.hypot(*np.median(self.shifts[self.measured], axis=0)))

    @property
    def limits(self) -> list[str]:
        """What this factor did not establish, in plain English."""
        notes = [
            "A residual measured here is a shift, not a cause: a shadow that moved under a "
            "different Sun shifts this measurement too. The Sun factor, which renders the height "
            "map at each image's Sun angle, is not built yet.",
            f"Residuals beyond about {self.window // 2} px inside one window wrap around and are not distinguished.",
            "Resampling the source onto the reference grid is itself done by cubic interpolation, "
            "which leaves about 0.13 px of apparent residual even on a perfectly registered pair, "
            "so numbers at that level are a floor and not a measured misalignment.",
        ]
        skipped = int((~self.measured).sum())
        if skipped:
            notes.append(
                f"{skipped} of {len(self.measured)} windows could not be measured: no data, too little "
                "texture, or no distinct phase peak. They are left out of every number above."
            )
        return notes

    def summary(self) -> dict:
        return {
            "windows": int(len(self.centres)),
            "measured": int(self.measured.sum()),
            "aligned": None if self.aligned is None else round(self.aligned, 4),
            "median_px": None if self.median_px is None else round(self.median_px, 4),
            "p90_px": None if self.p90_px is None else round(self.p90_px, 4),
            "systematic_px": None if self.systematic_px is None else round(self.systematic_px, 4),
            "tau_px": self.tau_px,
            "window": self.window,
            "limits": self.limits,
        }


def _hann(size: int) -> np.ndarray:
    """2-D Hann window; tapering the edges stops the window border acting like a step."""
    taper = np.hanning(size)
    return np.outer(taper, taper).astype(np.float64)


def _cross_power_spectrum(first: np.ndarray, second: np.ndarray, taper: np.ndarray) -> np.ndarray:
    """Unit-magnitude cross-power spectrum of two windows: conj(F(first)) * F(second), phase only."""
    a = np.fft.fft2((first - first.mean()) * taper)
    b = np.fft.fft2((second - second.mean()) * taper)
    cross = np.conj(a) * b
    return cross / np.maximum(np.abs(cross), 1e-12)


def _sharpness(surface: np.ndarray, row: int, col: int, exclude: int = 3) -> float:
    """Peak-to-sidelobe ratio: how far the peak stands above the rest of the surface, in its standard deviations."""
    height, width = surface.shape
    centred = np.roll(surface, (height // 2 - row, width // 2 - col), axis=(0, 1))
    mask = np.ones(surface.shape, dtype=bool)
    mask[
        max(height // 2 - exclude, 0) : height // 2 + exclude + 1,
        max(width // 2 - exclude, 0) : width // 2 + exclude + 1,
    ] = False
    sidelobe = centred[mask]
    # Identical content gives a perfectly clean delta, so the sidelobe spread is
    # zero. That is the ideal case, not a failure, and the floor turns it into a
    # very large ratio instead of a division by zero.
    spread = max(float(sidelobe.std()), 1e-9)
    return float((surface[row, col] - sidelobe.mean()) / spread)


def _refine_peak(cross: np.ndarray, row: float, col: float, upsample: int, radius: float) -> tuple[float, float]:
    """Sub-pixel peak position, by evaluating the inverse transform on a fine grid around the integer peak.

    Only the neighbourhood is evaluated, as a pair of matrix multiplications with
    the DFT kernels, so the cost does not grow with the window size.
    """
    height, width = cross.shape
    fy, fx = np.fft.fftfreq(height), np.fft.fftfreq(width)
    step = 1.0 / upsample
    rows = row + np.arange(-radius, radius + step / 2, step)
    cols = col + np.arange(-radius, radius + step / 2, step)
    kernel_rows = np.exp(2j * np.pi * np.outer(rows, fy))  # (R, height)
    kernel_cols = np.exp(2j * np.pi * np.outer(fx, cols))  # (width, C)
    local = np.real(kernel_rows @ cross @ kernel_cols)
    peak_row, peak_col = np.unravel_index(int(np.argmax(local)), local.shape)
    return float(rows[peak_row]), float(cols[peak_col])


def window_shift(
    reference_window: np.ndarray,
    aligned_window: np.ndarray,
    taper: np.ndarray | None = None,
    upsample: int = 20,
    radius: float = 1.5,
) -> tuple[np.ndarray, float]:
    """Residual (dx, dy) between two same-size windows, and the sharpness of the phase peak.

    The shift is where the aligned window's content sits relative to the
    reference window: `aligned(x) == reference(x - d)`. Correcting the mapping
    means moving the aligned image by `-d`.
    """
    size = reference_window.shape[0]
    taper = _hann(size) if taper is None else taper
    cross = _cross_power_spectrum(reference_window, aligned_window, taper)
    surface = np.real(np.fft.ifft2(cross))

    row, col = np.unravel_index(int(np.argmax(surface)), surface.shape)
    sharpness = _sharpness(surface, int(row), int(col))
    fine_row, fine_col = _refine_peak(cross, float(row), float(col), upsample, radius)

    # Unwrap: a peak past the halfway point of the transform is a negative shift.
    height, width = surface.shape
    dy = fine_row - height if fine_row > height / 2 else fine_row
    dx = fine_col - width if fine_col > width / 2 else fine_col
    return np.array([dx, dy]), sharpness


def residual_check(
    reference: np.ndarray,
    aligned: np.ndarray,
    window: int = 64,
    step: int = 96,
    tau_px: float = TAU_PX,
    min_sharpness: float = MIN_SHARPNESS,
    min_std: float = MIN_STD,
    upsample: int = 20,
) -> ResidualReport:
    """Measure leftover misalignment between the reference and the aligned source.

    Args:
        reference: the fixed image (NaN = no data).
        aligned: the source resampled onto the reference grid through the claimed
            mapping, same shape as `reference` (NaN outside the source footprint).
        window: window side in reference pixels; must be even and at least 16.
        step: spacing between window centres. Wider than `window` keeps
            neighbouring windows from sharing pixels.
        tau_px: a window counts as aligned within this distance.
        min_sharpness: minimum peak-to-sidelobe ratio to believe a measurement.
        min_std: minimum intensity spread required in both windows.
        upsample: sub-pixel resolution of the peak search, in steps per pixel.
    """
    reference = np.asarray(reference, dtype=np.float64)
    aligned = np.asarray(aligned, dtype=np.float64)
    if reference.shape != aligned.shape:
        raise ValueError(f"reference {reference.shape} and aligned {aligned.shape} must be on the same grid")
    if window % 2 or window < 16:
        raise ValueError("window must be even and at least 16 px")

    height, width = reference.shape[:2]
    half = window // 2
    centres_y = np.arange(half, height - half + 1, step)
    centres_x = np.arange(half, width - half + 1, step)
    if not len(centres_y) or not len(centres_x):
        raise ValueError(f"the image is too small for {window} px windows")

    taper = _hann(window)
    centres, shifts, sharpness, measured = [], [], [], []
    for cy in centres_y:
        for cx in centres_x:
            rows, cols = slice(cy - half, cy + half), slice(cx - half, cx + half)
            first, second = reference[rows, cols], aligned[rows, cols]
            centres.append((float(cx), float(cy)))

            usable = (
                np.all(np.isfinite(first))
                and np.all(np.isfinite(second))
                and float(first.std()) >= min_std
                and float(second.std()) >= min_std
            )
            if not usable:
                shifts.append((np.nan, np.nan))
                sharpness.append(0.0)
                measured.append(False)
                continue

            shift, peak = window_shift(first, second, taper, upsample=upsample)
            good = peak >= min_sharpness
            shifts.append(tuple(shift) if good else (np.nan, np.nan))
            sharpness.append(peak)
            measured.append(good)

    return ResidualReport(
        centres=np.asarray(centres, dtype=np.float64).reshape(-1, 2),
        shifts=np.asarray(shifts, dtype=np.float64).reshape(-1, 2),
        sharpness=np.asarray(sharpness, dtype=np.float64),
        measured=np.asarray(measured, dtype=bool),
        window=window,
        tau_px=tau_px,
    )
