"""Build the landing-page imagery and figures from real data and the real engine.

Inputs (not in git, see README):
  backend/data/vikram_site/{nac_ortho,ohrc,nac_dtm}/*.tif   Vikram landing site crops
  an IIRS PDS4 product label (.xml) with its .qub cube          optional, --iirs path

Outputs:
  src/assets/lunar/*.webp                     real image crops and engine products
  src/components/landing/realData.ts          tie points, grid errors and metrics of a real run

Run from frontend/:  python scripts/build_landing_assets.py [--iirs path/to/label.xml]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

FRONTEND = Path(__file__).resolve().parent.parent
BACKEND = FRONTEND.parent / "backend"
sys.path.insert(0, str(BACKEND))

from app.registration.geometry import DEFAULT_MODELS  # noqa: E402
from app.registration.imaging import load_image, normalize_to_uint8  # noqa: E402
from app.registration.pipeline import RegistrationConfig, register, warp_to_reference  # noqa: E402
from app.registration.products import error_heatmap, overlay_image  # noqa: E402

SITE = BACKEND / "data" / "vikram_site"
ASSETS = FRONTEND / "src" / "assets" / "lunar"
DATA_TS = FRONTEND / "src" / "components" / "landing" / "realData.ts"


def save(name: str, image: np.ndarray, size: int | tuple[int, int] | None = None, quality: int = 82) -> None:
    if size is not None:
        width, height = (size, size) if isinstance(size, int) else size
        interpolation = cv2.INTER_AREA if width < image.shape[1] else cv2.INTER_CUBIC
        image = cv2.resize(image, (width, height), interpolation=interpolation)
    cv2.imwrite(str(ASSETS / name), image, [cv2.IMWRITE_WEBP_QUALITY, quality])
    print(f"  {name:28s} {image.shape[1]}x{image.shape[0]}  {(ASSETS / name).stat().st_size // 1024} KB")


def crop(image: np.ndarray, x: int, y: int, size: int) -> np.ndarray:
    return image[y : y + size, x : x + size]


def hillshade(dem: np.ndarray, pixel_m: float, azimuth: float, elevation: float) -> np.ndarray:
    gy, gx = np.gradient(dem, pixel_m)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, el = np.radians(azimuth), np.radians(elevation)
    shade = np.sin(el) * np.cos(slope) + np.cos(el) * np.sin(slope) * np.cos(az - aspect)
    return (np.clip(shade, 0, 1) * 255).astype(np.uint8)


def normalised(points: np.ndarray, shape: tuple[int, int]) -> list[list[float]]:
    height, width = shape
    return [[round(float(x) / width, 4), round(float(y) / height, 4)] for x, y in points]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--iirs", type=Path, help="IIRS PDS4 label (.xml) next to its .qub cube")
    args = parser.parse_args()
    ASSETS.mkdir(parents=True, exist_ok=True)

    nac = load_image(SITE / "nac_ortho" / "vikram_landing_site_2km.tif")
    ohrc = load_image(SITE / "ohrc" / "vikram_landing_site_2km_ohrc_1m.tif")
    dtm = load_image(SITE / "nac_dtm" / "vikram_landing_site_dtm.tif")
    nac8, ohrc8 = normalize_to_uint8(nac.data), normalize_to_uint8(ohrc.data)

    print("Image crops")
    save("nac-site.webp", nac8, 720)
    save("ohrc-site.webp", ohrc8, 720)
    save("ohrc-bright-crater.webp", crop(ohrc8, 450, 780, 400), 480)
    save("ohrc-crater-field.webp", crop(ohrc8, 1400, 1400, 450), 480)
    save("ohrc-slope.webp", crop(ohrc8, 150, 1000, 600), 600)
    save("nac-crater.webp", crop(nac8, 470, 880, 400), 480)
    save("nac-boulders.webp", crop(nac8, 1400, 150, 500), 480)
    # TMC-2 has 5 m pixels; no TMC-2 frame of this site is available, so the OHRC view is downsampled to 5 m.
    save("ohrc-at-5m.webp", cv2.resize(crop(ohrc8, 150, 1000, 600), (120, 120), interpolation=cv2.INTER_AREA), 120, quality=90)

    dem = dtm.data.copy()
    dem[~np.isfinite(dem)] = np.nanmedian(dem)
    # Crater pair and slope near the landing site; a low Sun exaggerates the shading flip.
    dem = cv2.GaussianBlur(dem.astype(np.float32), (0, 0), 1.2)  # hides seams between DTM tiles
    dem_crop = crop(dem, 110, 250, 300)
    shades = [hillshade(dem_crop, dtm.metadata.get("gsd", 3.0), azimuth, 6.0) for azimuth in (90.0, 270.0)]
    low, high = np.percentile(np.stack(shades), [1, 99])
    for name, shade in zip(("dtm-sun-east.webp", "dtm-sun-west.webp"), shades):
        stretched = np.clip((shade.astype(np.float32) - low) / max(high - low, 1) * 255, 0, 255).astype(np.uint8)
        save(name, stretched, 600)

    print("Registration (local model and best global model)")
    full = register(nac.data, ohrc.data, reference_gsd=1.0)
    global_only = register(nac.data, ohrc.data, reference_gsd=1.0, config=RegistrationConfig(models=tuple(m for m in DEFAULT_MODELS if not m.local)))
    registered = warp_to_reference(ohrc.data, full.mapping, nac.shape)
    save("overlay-site.webp", overlay_image(nac.data, registered), 720)
    save("heatmap-local.webp", error_heatmap(nac.data, full.reference_points, full.holdout_errors), 720)
    save("heatmap-global.webp", error_heatmap(nac.data, global_only.reference_points, global_only.holdout_errors), 720)

    # Tie points: an even sample for correspondence lines, in normalised coordinates of each image.
    order = np.linspace(0, len(full.reference_points) - 1, 48).astype(int)
    tie_points = [
        {"ref": normalised(full.reference_points[i : i + 1], nac.shape)[0], "src": normalised(full.source_points[i : i + 1], ohrc.shape)[0], "err": round(float(full.holdout_errors[i]), 3)}
        for i in order
    ]
    grid_sample = normalised(full.reference_points[np.linspace(0, len(full.reference_points) - 1, 160).astype(int)], nac.shape)

    # The earlier SIFT + RANSAC baseline, for the distribution comparison.
    sift = cv2.SIFT_create(nfeatures=5000)
    source_kp, source_desc = sift.detectAndCompute(normalize_to_uint8(ohrc.data, 2, 98), None)
    reference_kp, reference_desc = sift.detectAndCompute(normalize_to_uint8(nac.data, 2, 98), None)
    pairs = cv2.BFMatcher(cv2.NORM_L2).knnMatch(source_desc, reference_desc, k=2)
    good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < 0.65 * n.distance]
    src = np.float64([source_kp[m.queryIdx].pt for m in good])
    ref = np.float64([reference_kp[m.trainIdx].pt for m in good])
    _, mask = cv2.findHomography(src, ref, cv2.RANSAC, 3.0)
    baseline_points = normalised(ref[mask.ravel().astype(bool)], nac.shape)

    cells = []
    for row in range(8):
        for col in range(8):
            inside = (full.reference_points[:, 1] // 250 == row) & (full.reference_points[:, 0] // 250 == col)
            errors = full.holdout_errors[inside]
            cells.append(None if errors.size == 0 else round(float(np.sqrt(np.mean(errors**2))), 3))

    # 9 x 9 pixels across the rim of the bright OHRC crater, for the sub-pixel illustration.
    patch = crop(ohrc8, 638, 950, 9).astype(int).ravel().tolist()

    iirs = None
    if args.iirs:
        print("IIRS")
        cube_band = load_image(args.iirs, band=40)
        # Remove the pushbroom detector striping: each column gets the same median level.
        band_data = cube_band.data - np.nanmedian(cube_band.data, axis=0, keepdims=True)
        strip = normalize_to_uint8(band_data)
        variance = cv2.blur((strip.astype(np.float32) - cv2.blur(strip.astype(np.float32), (15, 15))) ** 2, (120, 120))
        row = int(np.argmax(variance[:, strip.shape[1] // 2])) - 125
        row = int(np.clip(row, 0, strip.shape[0] - 250))
        save("iirs-patch.webp", strip[row : row + 250, :250], 250, quality=90)
        from app.registration.imaging import _load_pds4  # noqa: E402  (per-band access for the spectrum)

        spectrum = []
        for band in range(0, 256, 3):
            values = _load_pds4(args.iirs, band=band)
            spectrum.append((values.metadata.get("center_wavelength_nm"), float(np.nanmean(values.data[row : row + 250, :250]))))
        peak = max(v for _, v in spectrum)
        iirs = {
            "gsdM": cube_band.metadata.get("gsd"),
            "bandNm": cube_band.metadata.get("center_wavelength_nm"),
            "footprint": cube_band.metadata.get("footprint_deg"),
            "spectrum": [[round(nm / 1000, 3), round(v / peak, 4)] for nm, v in spectrum if nm],
            "product": args.iirs.stem,
        }

    data = {
        "site": "Vikram landing site (Chandrayaan-3), 2 km x 2 km, 1 m/px",
        "metrics": {
            "holdoutRmsePx": round(full.holdout_rmse, 3),
            "holdoutRmseM": round(full.holdout_rmse * 1.0, 3),
            "globalRmsePx": round(global_only.holdout_rmse, 3),
            "baselineRmsePx": 1.26,
            "tiePoints": int(len(full.reference_points)),
            "tiePointRatio": round(len(full.reference_points) / full.stats["grid_points"], 3),
            "coverage": round(full.coverage.coverage, 3),
            "uniformity": round(full.coverage.uniformity, 3),
            "baselineInliers": len(baseline_points),
            "putativeMatches": int(full.stats["putative_matches"]),
            "coarseInliers": int(full.stats["coarse_inliers"]),
            "model": full.model,
            "modelRmsePx": {k: round(v, 3) for k, v in full.model_rmse.items()},
        },
        "tiePoints": tie_points,
        "gridSample": grid_sample,
        "baselinePoints": baseline_points,
        "cells": cells,
        "rimPatch": patch,
        "iirs": iirs,
    }
    DATA_TS.write_text(
        "// Generated by scripts/build_landing_assets.py from a real registration run. Do not edit by hand.\n"
        f"export const REAL = {json.dumps(data, separators=(',', ':'))} as const;\n",
        encoding="utf-8",
    )
    print(f"  realData.ts {DATA_TS.stat().st_size // 1024} KB · hold-out {full.holdout_rmse:.3f} px ({full.model})")


if __name__ == "__main__":
    main()
