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
        reference_label="NASA LRO NAC photo · 1 m per pixel",
        source_label="Chandrayaan-2 OHRC photo · 1 m per pixel",
        reference="vikram_site/nac_ortho/vikram_landing_site_2km.tif",
        source="vikram_site/ohrc/vikram_landing_site_2km_ohrc_1m.tif",
    ),
    Sample(
        id="photo-vs-height-render",
        title="Photo vs height-map render (same site)",
        title_hi="फोटो बनाम ऊँचाई-मानचित्र (वही स्थल)",
        description="Same 2 km around the Vikram landing site, but a different kind of image: the LROC NAC photo against a picture rendered from the LROC height map (DTM) with a similar Sun. Looks different, should still align.",
        reference_label="NASA LRO NAC photo · 3 m per pixel",
        source_label="Made from NASA height map · 3 m per pixel",
        reference="demo_height_render/nac_photo_3m.tif",
        source="demo_height_render/dtm_render_3m.tif",
    ),
    Sample(
        id="different-spots",
        title="Two different spots (should be rejected)",
        title_hi="दो अलग जगहें (अस्वीकार होना चाहिए)",
        description="North-west kilometre of the NAC photo against the south-east kilometre of the OHRC image. The areas do not overlap, so the engine should refuse the pair and explain why.",
        reference_label="NASA LRO NAC photo · top-left 1 km",
        source_label="Chandrayaan-2 OHRC photo · bottom-right 1 km",
        reference="demo_different_spots/nac_northwest_1km.tif",
        source="demo_different_spots/ohrc_southeast_1km.tif",
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
