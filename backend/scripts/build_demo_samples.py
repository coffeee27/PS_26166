"""Build extra demo pairs from the Vikram landing-site data.

1. demo_different_spots: the north-west kilometre of the NAC orthophoto against the
   south-east kilometre of OHRC. The areas do not overlap, so the engine must refuse
   the pair.
2. demo_height_render: the NAC orthophoto at 3 m against an image rendered from the
   LROC DTM of the same site (3 m) with the Sun near the direction that best matches
   the NAC shading (azimuth 330 deg, elevation 10 deg). Same ground, different kind of
   data: a photograph against shaded terrain heights, with no surface brightness
   variation.
3. demo_zoom_gap: OHRC shrunk to 5 m per pixel (about TMC-2 detail), registered onto
   the 1 m NAC orthophoto. It still aligns, but some regions are weaker (moderate PROVE).
4. demo_half_overlap: only the east half of OHRC against the whole NAC orthophoto.
   What aligns is accurate, but half of the reference has no tie points (moderate PROVE).
5. demo_illumination: the same LROC DTM rendered twice, with the Sun 35 deg apart in
   azimuth and 60 deg apart in elevation. Both renders come from the same terrain on the
   same grid, so the true answer is exactly identity and the measured error is real
   accuracy, not a self-graded number. Measured: 0.057 px median at 98% coverage. The
   engine refuses at a 40 deg azimuth gap, so this sits just inside what it can do.
6. demo_viewpoint: a 20 deg off-nadir view sampled from inside OHRC, so the frame is full
   with no empty corners, registered onto a matching crop of the 1 m NAC orthophoto. The
   warp is known, so the error against it is real accuracy. Measured: 0.20 px median,
   381 tie points, 100% coverage.

Run from backend/:  python scripts/build_demo_samples.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.registration.imaging import load_image, write_geotiff  # noqa: E402

DATA = BACKEND / "data"
SITE = DATA / "vikram_site"
NAC = SITE / "nac_ortho" / "vikram_landing_site_2km.tif"
OHRC = SITE / "ohrc" / "vikram_landing_site_2km_ohrc_1m.tif"
DTM = SITE / "nac_dtm" / "vikram_landing_site_dtm.tif"

SUN_AZIMUTH = 330.0
SUN_ELEVATION = 10.0
ZOOM_GAP_GSD = 5.0
# Illumination demo: 35 deg apart in azimuth, 60 deg apart in elevation. Measured to work
# at 0.057 px true error with 98% coverage. A 40 deg azimuth gap is refused, so this sits
# just inside the limit. Note the site is flat (mean slope 3 deg, 53 m of relief over 2 km),
# so the two renders differ mostly in overall brightness; after a contrast stretch their
# structures still correlate at +0.80. Rugged terrain would show a far larger difference.
SUN_A = (330.0, 5.0)
SUN_B = (5.0, 65.0)
# Viewpoint demo: a 20 deg off-nadir look with a perspective term. The window is sampled
# from inside OHRC so the output frame is completely filled, the way a real off-nadir image
# is: a full rectangle whose ground footprint is skewed, not a rotated picture with empty
# corners. The NAC reference is cropped to the part that footprint actually covers, so the
# pair still reaches 100% coverage. Measured: 0.20 px true error, 381 tie points.
TILT_DEGREES = 20.0
TILT_PERSPECTIVE = 1.0e-4
TILT_OUTPUT = 1380
TILT_REF_CROP = 800
_MODEL_PIXEL_SCALE = 33550


def with_pixel_size(metadata: dict, pixel_size: float) -> dict:
    """Metadata whose GeoTIFF tags describe the same origin with a different pixel size."""
    tags = []
    for code, dtype, count, value in metadata.get("geotiff_tags", []):
        if code == _MODEL_PIXEL_SCALE:
            value = (pixel_size, pixel_size, 0.0)
        tags.append((code, dtype, count, value))
    return {**metadata, "geotiff_tags": tags}


def tilt_homography(width: int, height: int, degrees: float, perspective: float, output: int) -> np.ndarray:
    """Source pixel -> output pixel for an off-nadir look centred on the source."""
    th = np.radians(degrees)
    rotate = np.array([[np.cos(th), -np.sin(th), 0.0], [np.sin(th), np.cos(th), 0.0], [0.0, 0.0, 1.0]])
    to_origin = np.array([[1.0, 0.0, -width / 2.0], [0.0, 1.0, -height / 2.0], [0.0, 0.0, 1.0]])
    back = np.array([[1.0, 0.0, output / 2.0], [0.0, 1.0, output / 2.0], [0.0, 0.0, 1.0]])
    skew = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [perspective, perspective * 0.6, 1.0]])
    return back @ skew @ rotate @ to_origin


def hillshade(dem: np.ndarray, pixel_m: float, azimuth: float, elevation: float) -> np.ndarray:
    gy, gx = np.gradient(dem, pixel_m)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, el = np.radians(azimuth), np.radians(elevation)
    return np.clip(np.sin(el) * np.cos(slope) + np.cos(el) * np.sin(slope) * np.cos(az - aspect), 0, 1)


def main() -> None:
    nac, ohrc, dtm = load_image(NAC), load_image(OHRC), load_image(DTM)

    spots = DATA / "demo_different_spots"
    spots.mkdir(parents=True, exist_ok=True)
    # The top-left crop keeps the orthophoto's origin, so its georeferencing stays valid.
    write_geotiff(spots / "nac_northwest_1km.tif", nac.data[:1000, :1000], nac.metadata)
    write_geotiff(spots / "ohrc_southeast_1km.tif", ohrc.data[1000:, 1000:])
    print(f"wrote {spots}")

    render = DATA / "demo_height_render"
    render.mkdir(parents=True, exist_ok=True)
    dtm_gsd = dtm.metadata["gsd"]
    size = dtm.shape[1]
    ground = int(round(size * dtm_gsd / nac.metadata["gsd"]))
    nac_coarse = cv2.resize(nac.data[:ground, :ground], (size, size), interpolation=cv2.INTER_AREA)
    write_geotiff(render / "nac_photo_3m.tif", nac_coarse, with_pixel_size(nac.metadata, ground * nac.metadata["gsd"] / size))

    dem = dtm.data.astype(np.float64)
    missing = ~np.isfinite(dem)
    dem[missing] = np.nanmedian(dem)
    shaded = hillshade(dem, dtm_gsd, SUN_AZIMUTH, SUN_ELEVATION).astype(np.float32)
    shaded[missing] = np.nan
    write_geotiff(render / "dtm_render_3m.tif", shaded, dtm.metadata)
    print(f"wrote {render}")

    zoom = DATA / "demo_zoom_gap"
    zoom.mkdir(parents=True, exist_ok=True)
    ohrc_gsd = 1.0  # the OHRC crop was resampled to the NAC's 1 m grid
    size = int(round(ohrc.shape[1] * ohrc_gsd / ZOOM_GAP_GSD))
    shrunk = cv2.resize(ohrc.data, (size, size), interpolation=cv2.INTER_AREA)
    # Only the pixel size is tagged, so the engine knows to scale it back up before matching.
    pixel_size = ohrc.shape[1] * ohrc_gsd / size
    write_geotiff(zoom / "ohrc_5m.tif", shrunk, {"geotiff_tags": [(_MODEL_PIXEL_SCALE, "d", 3, (pixel_size, pixel_size, 0.0))]})
    print(f"wrote {zoom}")

    half = DATA / "demo_half_overlap"
    half.mkdir(parents=True, exist_ok=True)
    write_geotiff(half / "ohrc_east_half.tif", ohrc.data[:, ohrc.shape[1] // 2 :])
    print(f"wrote {half}")

    # Both renders are written on 0-255, not 0-1: the fine matcher rejects any reference
    # template whose standard deviation is below 1.0, so a 0-1 image loses every tie point.
    sun = DATA / "demo_illumination"
    sun.mkdir(parents=True, exist_ok=True)
    for name, (azimuth, elevation) in (("sun_a_3m.tif", SUN_A), ("sun_b_3m.tif", SUN_B)):
        shade = (hillshade(dem, dtm_gsd, azimuth, elevation) * 255.0).astype(np.float32)
        shade[missing] = np.nan
        write_geotiff(sun / name, shade, dtm.metadata)
    print(f"wrote {sun}")

    view = DATA / "demo_viewpoint"
    view.mkdir(parents=True, exist_ok=True)
    rows, cols = ohrc.shape
    homography = tilt_homography(cols, rows, TILT_DEGREES, TILT_PERSPECTIVE, TILT_OUTPUT)
    tilted = cv2.warpPerspective(
        ohrc.data.astype(np.float32), homography, (TILT_OUTPUT, TILT_OUTPUT),
        flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=float("nan"),
    )
    write_geotiff(view / "ohrc_tilted.tif", tilted)
    offset = (nac.shape[0] - TILT_REF_CROP) // 2
    write_geotiff(
        view / "nac_crop.tif",
        nac.data[offset : offset + TILT_REF_CROP, offset : offset + TILT_REF_CROP],
        nac.metadata,
    )
    print(f"wrote {view}")


if __name__ == "__main__":
    main()
