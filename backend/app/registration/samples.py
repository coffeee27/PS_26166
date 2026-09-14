"""Real image pairs that ship with the demo machine (large data files are not in git).

A sample is listed as available only when both of its files exist under
backend/data/, so a fresh clone simply shows none.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2

from .imaging import load_image
from .products import preview_image


@dataclass(frozen=True)
class Sample:
    id: str
    title: str
    title_hi: str
    description: str
    reference_label: str
    source_label: str
    reference: str  # path relative to the data directory
    source: str


SAMPLES = (
    Sample(
        id="vikram-landing-site",
        title="Vikram landing site (Chandrayaan-3)",
        title_hi="विक्रम लैंडिंग स्थल (चंद्रयान-3)",
        description="2 km × 2 km around the Chandrayaan-3 landing site: Chandrayaan-2 OHRC against the LROC NAC orthophoto.",
        reference_label="LRO NAC orthophoto · 1 m/px · 16-bit",
        source_label="Chandrayaan-2 OHRC · resampled to 1 m/px · 8-bit",
        reference="vikram_site/nac_ortho/vikram_landing_site_2km.tif",
        source="vikram_site/ohrc/vikram_landing_site_2km_ohrc_1m.tif",
    ),
)


def get_sample(sample_id: str) -> Sample | None:
    return next((sample for sample in SAMPLES if sample.id == sample_id), None)


def is_available(sample: Sample, data_dir: Path) -> bool:
    return (data_dir / sample.reference).is_file() and (data_dir / sample.source).is_file()


def write_preview(image_path: Path, preview_path: Path) -> tuple[int, int]:
    """Save a browser-friendly 8-bit JPEG of any supported image; returns the original (height, width)."""
    image = load_image(image_path)
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(preview_path), preview_image(image.data), [cv2.IMWRITE_JPEG_QUALITY, 90])
    return image.shape


def describe(sample: Sample, data_dir: Path, url_prefix: str) -> dict:
    """JSON description of a sample, creating its preview images on first use."""
    previews = {}
    shapes = {}
    for role in ("reference", "source"):
        preview = data_dir / "samples" / sample.id / f"{role}_preview.jpg"
        source_path = data_dir / getattr(sample, role)
        if not preview.is_file() or preview.stat().st_mtime < source_path.stat().st_mtime:
            shapes[role] = write_preview(source_path, preview)
        else:
            shapes[role] = load_image(source_path).shape
        previews[role] = f"{url_prefix}/samples/{sample.id}/{role}_preview.jpg"

    return {
        "id": sample.id,
        "title": sample.title,
        "title_hi": sample.title_hi,
        "description": sample.description,
        "reference": {
            "label": sample.reference_label,
            "filename": Path(sample.reference).name,
            "preview": previews["reference"],
            "shape": list(shapes["reference"]),
            "size_bytes": (data_dir / sample.reference).stat().st_size,
        },
        "source": {
            "label": sample.source_label,
            "filename": Path(sample.source).name,
            "preview": previews["source"],
            "shape": list(shapes["source"]),
            "size_bytes": (data_dir / sample.source).stat().st_size,
        },
    }
