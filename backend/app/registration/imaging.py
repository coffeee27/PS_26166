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


_PDS4_DTYPES = {
    "UnsignedByte": "u1", "SignedByte": "i1",
    "UnsignedLSB2": "<u2", "SignedLSB2": "<i2", "UnsignedMSB2": ">u2", "SignedMSB2": ">i2",
    "UnsignedLSB4": "<u4", "SignedLSB4": "<i4", "UnsignedMSB4": ">u4", "SignedMSB4": ">i4",
    "IEEE754LSBSingle": "<f4", "IEEE754MSBSingle": ">f4", "IEEE754LSBDouble": "<f8", "IEEE754MSBDouble": ">f8",
}
_PDS4_MISSING = ("missing_constant", "invalid_constant", "unknown_constant", "not_applicable_constant")
_FOOTPRINT_CORNERS = ("upper_left", "upper_right", "lower_left", "lower_right")


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _child(element, name: str):
    return next((c for c in element if _local(c.tag) == name), None)


def _text(element, name: str) -> str | None:
    found = _child(element, name)
    return None if found is None or found.text is None else found.text.strip()


def _load_pds4(label_path: Path, band: int | None = None) -> LunarImage:
    """Read one image plane of a PDS4 product (e.g. Chandrayaan-2 OHRC, TMC-2, IIRS) from its XML label.

    The array is memory-mapped, so a single band of a multi-gigabyte spectral cube
    is read without loading the rest. `band` is the 0-based index along a BAND axis
    (default: the middle band). Pixel size, footprint corners and band wavelength
    are taken from the label when present.
    """
    import xml.etree.ElementTree as ElementTree

    root = ElementTree.parse(label_path).getroot()
    for file_area in (e for e in root.iter() if _local(e.tag) == "File_Area_Observational"):
        file_name = _text(_child(file_area, "File"), "file_name")
        for array in (e for e in file_area if _local(e.tag).startswith("Array_") and int(_text(e, "axes") or 0) >= 2):
            element = _child(array, "Element_Array")
            dtype = np.dtype(_PDS4_DTYPES[_text(element, "data_type")])
            axes = sorted(
                ((int(_text(a, "sequence_number")), (_text(a, "axis_name") or "").upper(), int(_text(a, "elements")))
                 for a in array if _local(a.tag) == "Axis_Array"),
            )
            shape = tuple(n for _, _, n in axes)
            order = "C" if (_text(array, "axis_index_order") or "Last Index Fastest") == "Last Index Fastest" else "F"
            cube = np.memmap(label_path.parent / file_name, dtype=dtype, mode="r", offset=int(_text(array, "offset") or 0), shape=shape, order=order)

            metadata: dict = {"format": "PDS4", "array": _local(array.tag), "axes": [name for _, name, _ in axes]}
            names = [name for _, name, _ in axes]
            if cube.ndim == 3:
                band_axis = names.index("BAND") if "BAND" in names else int(np.argmin(shape))
                band = shape[band_axis] // 2 if band is None else band
                if not 0 <= band < shape[band_axis]:
                    raise ValueError(f"Band {band} out of range 0..{shape[band_axis] - 1}")
                plane = np.take(cube, band, axis=band_axis)
                metadata["band"] = band
                bins = [b for b in array.iter() if _local(b.tag) == "Band_Bin"]
                if band < len(bins) and (wavelength := _text(bins[band], "center_wavelength")):
                    metadata["center_wavelength_nm"] = float(wavelength)
            elif cube.ndim == 2:
                plane = cube
            else:
                continue

            data = np.asarray(plane, dtype=np.float32)
            scale, offset = _text(element, "scaling_factor"), _text(element, "value_offset")
            invalid = np.zeros(data.shape, dtype=bool)
            constants = _child(array, "Special_Constants")
            for name in _PDS4_MISSING:
                if constants is not None and (value := _text(constants, name)) is not None:
                    invalid |= data == float(value)
            if scale or offset:
                data = data * float(scale or 1.0) + float(offset or 0.0)
            if invalid.any():
                data[invalid] = np.nan
                metadata["nodata_pixels"] = int(invalid.sum())

            elements = {_local(e.tag): e for e in root.iter()}
            if (resolution := elements.get("pixel_resolution")) is not None and resolution.text:
                factor = 1000.0 if (resolution.get("unit") or "").lower().startswith("km") else 1.0
                metadata["gsd"] = float(resolution.text) * factor
            footprint = {}
            for corner in _FOOTPRINT_CORNERS:
                lat, lon = elements.get(f"{corner}_latitude"), elements.get(f"{corner}_longitude")
                if lat is not None and lon is not None:
                    footprint[corner] = (float(lat.text), float(lon.text))
            if footprint:
                metadata["footprint_deg"] = footprint
            for key in ("sun_elevation", "sun_azimuth", "solar_incidence", "solar_azimuth"):
                if (angle := elements.get(key)) is not None and angle.text:
                    metadata[f"{key}_deg"] = float(angle.text)

            return LunarImage(data=data, source_dtype=str(dtype), path=str(label_path), metadata=metadata)
    raise ValueError(f"No image array found in PDS4 label {label_path}")


_GDAL_NODATA = 42113
_MODEL_PIXEL_SCALE = 33550
_MODEL_TIEPOINT = 33922
_GEO_KEY_DIRECTORY = 34735
# Tags that carry georeferencing; copied unchanged onto products on the same pixel grid.
_GEOTIFF_TAGS = (_MODEL_PIXEL_SCALE, _MODEL_TIEPOINT, 34264, _GEO_KEY_DIRECTORY, 34736, 34737)
_GT_RASTER_TYPE_KEY = 1025
_RASTER_PIXEL_IS_POINT = 2


def _raster_type(geo_keys) -> int | None:
    keys = [int(v) for v in geo_keys]
    for i in range(4, len(keys) - 3, 4):
        if keys[i] == _GT_RASTER_TYPE_KEY:
            return keys[i + 3]
    return None


def _load_tiff(path: Path) -> LunarImage:
    """Read a (Geo)TIFF, keeping pixel size / origin and turning no-data into NaN."""
    import tifffile

    metadata: dict = {"format": "TIFF"}
    nodata = None
    try:
        with tifffile.TiffFile(str(path)) as tif:
            page = tif.pages[0]
            array = page.asarray()
            if (tag := page.tags.get(_GDAL_NODATA)) is not None:
                try:
                    nodata = float(str(tag.value).strip("\x00 "))
                except ValueError:
                    nodata = None
            if (tag := page.tags.get(_MODEL_PIXEL_SCALE)) is not None:
                scale_x, scale_y = (float(v) for v in tag.value[:2])
                metadata["pixel_size"] = (scale_x, scale_y)
                metadata["gsd"] = scale_x
            if (tag := page.tags.get(_MODEL_TIEPOINT)) is not None:
                metadata["tiepoint_pixel"] = tuple(float(v) for v in tag.value[0:2])
                metadata["origin"] = tuple(float(v) for v in tag.value[3:5])
            if (tag := page.tags.get(_GEO_KEY_DIRECTORY)) is not None:
                metadata["pixel_is_point"] = _raster_type(tag.value) == _RASTER_PIXEL_IS_POINT
            geotags = [(t.code, t.dtype, t.count, t.value) for t in page.tags.values() if t.code in _GEOTIFF_TAGS]
            if geotags:
                metadata["geotiff_tags"] = geotags
    except ValueError:
        # Compressed TIFFs need imagecodecs; OpenCV decodes LZW/Deflate natively.
        array = cv2.imread(str(path), cv2.IMREAD_UNCHANGED | cv2.IMREAD_ANYDEPTH)
        if array is None:
            raise

    data = _to_single_band(array).astype(np.float32)
    # LROC DTMs mark missing cells with the most negative float32; treat any such sentinel as missing.
    invalid = data < -1e30
    if nodata is not None and np.isfinite(nodata):
        invalid |= np.isclose(data, nodata, rtol=1e-6, atol=0)
    if invalid.any():
        data[invalid] = np.nan
        metadata["nodata_pixels"] = int(invalid.sum())

    return LunarImage(data=data, source_dtype=str(array.dtype), path=str(path), metadata=metadata)


def load_image(path: str | Path, band: int | None = None) -> LunarImage:
    """Load PNG/JPG/WebP/TIFF (8 or 16-bit) or a PDS4 product (pass the .xml label; `band` selects a cube plane)."""
    path = Path(path)
    suffix = path.suffix.lower()

    if suffix == ".xml":
        return _load_pds4(path, band)

    if suffix in (".tif", ".tiff"):
        return _load_tiff(path)
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


def write_geotiff(path: str | Path, data: np.ndarray, metadata: dict | None = None) -> None:
    """Write a float32 TIFF with NaN as no-data, carrying the georeferencing of `metadata` if present.

    Use the metadata of the image whose pixel grid `data` is on (for a registered
    product, the reference image).
    """
    import tifffile

    extratags = [(_GDAL_NODATA, "s", 0, "nan", True)]
    for code, dtype, count, value in (metadata or {}).get("geotiff_tags", []):
        extratags.append((code, dtype, 0 if isinstance(value, str) else count, value, True))
    tifffile.imwrite(str(path), np.asarray(data, dtype=np.float32), compression="zlib", extratags=extratags)


def pixel_to_map(points: np.ndarray, metadata: dict) -> np.ndarray | None:
    """Map coordinates (projection units, usually metres) of pixel-centre coordinates, or None if not georeferenced."""
    if "pixel_size" not in metadata or "origin" not in metadata:
        return None
    points = np.asarray(points, dtype=np.float64).reshape(-1, 2)
    scale_x, scale_y = metadata["pixel_size"]
    origin_x, origin_y = metadata["origin"]
    tie_i, tie_j = metadata.get("tiepoint_pixel", (0.0, 0.0))
    # PixelIsArea tie points refer to the pixel corner; pixel centres sit half a pixel inside.
    centre = 0.0 if metadata.get("pixel_is_point") else 0.5
    map_x = origin_x + (points[:, 0] + centre - tie_i) * scale_x
    map_y = origin_y - (points[:, 1] + centre - tie_j) * scale_y
    return np.column_stack([map_x, map_y])


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
