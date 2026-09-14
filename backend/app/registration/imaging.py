"""Image loading, intensity normalisation and resolution alignment.

Lunar products are usually 12/16-bit, so images are kept as float32 in their
original radiometry and only converted to 8-bit where a matcher requires it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np


@dataclass
class LunarImage:
    """A single-band image plus whatever metadata the source format provided."""

    data: np.ndarray  # float32, shape (H, W)
    source_dtype: str
    path: str | None = None
    metadata: dict = field(default_factory=dict)

    @property
    def shape(self) -> tuple[int, int]:
        return self.data.shape[:2]


def _to_single_band(array: np.ndarray) -> np.ndarray:
    array = np.squeeze(array)
    if array.ndim == 3:
        # Colour previews (PNG/JPG) are reduced to luminance; science products are single-band.
        if array.shape[2] in (3, 4):
            array = cv2.cvtColor(array[:, :, :3].astype(np.float32), cv2.COLOR_BGR2GRAY)
        else:
            array = array[:, :, 0]
    if array.ndim != 2:
        raise ValueError(f"Expected a 2-D image, got shape {array.shape}")
    return array


def _load_pds4(label_path: Path) -> LunarImage:
    """Read the first 2-D array in a PDS4 product described by its XML label."""
    import pds4_tools  # imported lazily: only needed for archive products

    structures = pds4_tools.read(str(label_path), quiet=True, lazy_load=True)
    for structure in structures:
        if not structure.is_array():
            continue
        array = np.asarray(structure.data)
        if array.ndim >= 2:
            return LunarImage(
                data=_to_single_band(array).astype(np.float32),
                source_dtype=str(array.dtype),
                path=str(label_path),
                metadata={"format": "PDS4", "structure": structure.id},
            )
    raise ValueError(f"No 2-D image array found in PDS4 label {label_path}")


def load_image(path: str | Path) -> LunarImage:
    """Load PNG/JPG/WebP/TIFF (8 or 16-bit) or a PDS4 product (pass the .xml label)."""
    path = Path(path)
    suffix = path.suffix.lower()

    if suffix == ".xml":
        return _load_pds4(path)

    if suffix in (".tif", ".tiff"):
        import tifffile

        array = tifffile.imread(str(path))
    else:
        array = cv2.imread(str(path), cv2.IMREAD_UNCHANGED | cv2.IMREAD_ANYDEPTH)
        if array is None:
            raise ValueError(f"Could not read image {path}")

    return LunarImage(
        data=_to_single_band(array).astype(np.float32),
        source_dtype=str(array.dtype),
        path=str(path),
        metadata={"format": suffix.lstrip(".").upper()},
    )


def normalize_to_uint8(
    data: np.ndarray, low_percentile: float = 0.5, high_percentile: float = 99.5, clahe: bool = False
) -> np.ndarray:
    """Percentile-stretch any bit depth to 8-bit for matchers that need it."""
    valid = data[np.isfinite(data)]
    if valid.size == 0:
        return np.zeros(data.shape, dtype=np.uint8)
    low, high = np.percentile(valid, [low_percentile, high_percentile])
    scale = 255.0 / max(high - low, 1e-6)
    out = np.clip((np.nan_to_num(data, nan=low) - low) * scale, 0, 255).astype(np.uint8)
    if clahe:
        out = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(out)
    return out


@dataclass
class Resampling:
    """Maps pixel coordinates between a native image and its resampled copy.

    Uses the pixel-centre convention, so sub-pixel positions survive the round trip:
    x_resampled = (x_native + 0.5) * scale_x - 0.5.
    """

    scale_x: float
    scale_y: float

    def to_resampled(self, points: np.ndarray) -> np.ndarray:
        points = np.asarray(points, dtype=np.float64)
        return np.column_stack(
            [(points[:, 0] + 0.5) * self.scale_x - 0.5, (points[:, 1] + 0.5) * self.scale_y - 0.5]
        )

    def to_native(self, points: np.ndarray) -> np.ndarray:
        points = np.asarray(points, dtype=np.float64)
        return np.column_stack(
            [(points[:, 0] + 0.5) / self.scale_x - 0.5, (points[:, 1] + 0.5) / self.scale_y - 0.5]
        )


def resample_to_gsd(
    image: np.ndarray, source_gsd: float, target_gsd: float
) -> tuple[np.ndarray, Resampling]:
    """Resample an image from `source_gsd` to `target_gsd` (metres per pixel).

    A 0.25 m OHRC strip matched against a 1 m NAC orthophoto is shrunk 4x so
    features appear at the same size in both images before matching.
    """
    if source_gsd <= 0 or target_gsd <= 0:
        raise ValueError("Ground sample distances must be positive")
    factor = source_gsd / target_gsd
    height, width = image.shape[:2]
    new_width = max(1, int(round(width * factor)))
    new_height = max(1, int(round(height * factor)))
    interpolation = cv2.INTER_AREA if factor < 1 else cv2.INTER_CUBIC
    resampled = cv2.resize(image, (new_width, new_height), interpolation=interpolation)
    return resampled, Resampling(scale_x=new_width / width, scale_y=new_height / height)
