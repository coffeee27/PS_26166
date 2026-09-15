"""Build the PROVE section data of the landing page from real engine runs.

Inputs (not in git, see README): backend/data/vikram_site/* and the demo pairs made by
backend/scripts/build_demo_samples.py.

Output: src/components/landing/proveData.ts
  samples   result and PROVE checks of each demo pair, exactly as the API returns them
  zoom      error and PROVE evidence as OHRC is shrunk from 1 m to 10 m per pixel
  sunFlip   shading correlation between the NAC photo and the height-map render, with the
            Sun on the same side and on the opposite side

Run from frontend/:  python scripts/build_prove_data.py
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

FRONTEND = Path(__file__).resolve().parent.parent
BACKEND = FRONTEND.parent / "backend"
sys.path.insert(0, str(BACKEND))

from app.registration import samples  # noqa: E402
from app.registration.imaging import load_image  # noqa: E402
from app.registration.pipeline import register  # noqa: E402
from app.registration.products import cell_statistics  # noqa: E402
from app.registration.prove import prove_score  # noqa: E402
from app.registration.service import analyze_pair  # noqa: E402

DATA = BACKEND / "data"
SITE = DATA / "vikram_site"
OUTPUT = FRONTEND / "src" / "components" / "landing" / "proveData.ts"

ZOOM_GSDS = (1.0, 3.0, 5.0, 8.0, 10.0)
SUN_ELEVATION = 10.0
SUN_SAME, SUN_OPPOSITE = 330.0, 150.0


def compact_checks(prove: dict) -> list[dict]:
    return [
        {key: check[key] for key in ("id", "value", "limit", "comparison", "unit", "passed")}
        | {"value": None if check["value"] is None else round(check["value"], 3)}
        for check in prove["checks"]
    ]


def run_samples() -> list[dict]:
    results = []
    for sample in samples.SAMPLES:
        print(f"  {sample.id}")
        entry = {"id": sample.id, "title": sample.title, "reference": sample.reference_label, "source": sample.source_label}
        try:
            with tempfile.TemporaryDirectory() as out:
                result = analyze_pair(DATA / sample.reference, DATA / sample.source, Path(out), "/x")
        except ValueError as error:
            results.append(entry | {"outcome": "REFUSED", "reason": str(error).split(". ")[0] + "."})
            continue
        prove, engine = result["prove"], result["engine"]
        results.append(
            entry
            | {
                "outcome": prove["evidence"],
                "passed": prove["passed"],
                "total": prove["total"],
                "rmsePx": round(result["metrics"]["rmse"], 2),
                "rmseM": None if engine["holdout_rmse_m"] is None else round(engine["holdout_rmse_m"], 2),
                "tiePoints": result["metrics"]["inlier_count"],
                "model": engine["model"],
                "checks": compact_checks(prove),
            }
        )
    return results


def run_zoom() -> list[dict]:
    nac = load_image(SITE / "nac_ortho" / "vikram_landing_site_2km.tif").data
    ohrc = load_image(SITE / "ohrc" / "vikram_landing_site_2km_ohrc_1m.tif").data
    rows = []
    for gsd in ZOOM_GSDS:
        print(f"  zoom {gsd:g} m")
        size = int(round(ohrc.shape[1] / gsd))
        source = ohrc if gsd == 1.0 else cv2.resize(ohrc, (size, size), interpolation=cv2.INTER_AREA)
        result = register(nac, source, reference_gsd=1.0, source_gsd=ohrc.shape[1] / size)
        cells = cell_statistics(result.reference_points, result.holdout_errors, nac.shape)
        prove = prove_score(
            result.holdout_rmse, result.stats["putative_matches"], result.stats["coarse_inliers"],
            result.coverage.coverage, result.coverage.uniformity, cells,
        )
        rows.append({"gsdM": gsd, "rmsePx": round(result.holdout_rmse, 2), "passed": prove["passed"], "evidence": prove["evidence"]})
    return rows


def run_sun_flip() -> dict:
    nac = load_image(SITE / "nac_ortho" / "vikram_landing_site_2km.tif")
    dtm = load_image(SITE / "nac_dtm" / "vikram_landing_site_dtm.tif")
    dem = dtm.data.astype(np.float64)
    dem[~np.isfinite(dem)] = np.nanmedian(dem)
    size = dem.shape[1]
    ground = int(round(size * dtm.metadata["gsd"]))
    photo = cv2.resize(np.nan_to_num(nac.data[:ground, :ground], nan=float(np.nanmedian(nac.data))), (size, size), interpolation=cv2.INTER_AREA)

    def shade(azimuth: float) -> np.ndarray:
        gy, gx = np.gradient(dem, dtm.metadata["gsd"])
        slope, aspect = np.arctan(np.hypot(gx, gy)), np.arctan2(-gx, gy)
        az, el = np.radians(azimuth), np.radians(SUN_ELEVATION)
        return np.clip(np.sin(el) * np.cos(slope) + np.cos(el) * np.sin(slope) * np.cos(az - aspect), 0, 1).astype(np.float32)

    def band_correlation(a: np.ndarray, b: np.ndarray) -> float:
        # Compare crater-scale shading only: remove fine noise and broad brightness trends.
        a = cv2.GaussianBlur(a, (0, 0), 1) - cv2.GaussianBlur(a, (0, 0), 8)
        b = cv2.GaussianBlur(b, (0, 0), 1) - cv2.GaussianBlur(b, (0, 0), 8)
        return float(np.mean((a - a.mean()) / a.std() * (b - b.mean()) / b.std()))

    return {
        "elevationDeg": SUN_ELEVATION,
        "sameAzimuthDeg": SUN_SAME,
        "oppositeAzimuthDeg": SUN_OPPOSITE,
        "same": round(band_correlation(photo.astype(np.float32), shade(SUN_SAME)), 2),
        "opposite": round(band_correlation(photo.astype(np.float32), shade(SUN_OPPOSITE)), 2),
    }


def main() -> None:
    print("Demo pairs")
    sample_results = run_samples()
    print("Zoom sweep")
    zoom = run_zoom()
    print("Sun flip")
    sun = run_sun_flip()
    data = {"samples": sample_results, "zoom": zoom, "sunFlip": sun}
    OUTPUT.write_text(
        "// Generated by scripts/build_prove_data.py from real engine runs. Do not edit by hand.\n"
        f"export const PROVE_DATA = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))} as const;\n",
        encoding="utf-8",
    )
    print(json.dumps({"zoom": zoom, "sunFlip": sun}, indent=1))
    for s in sample_results:
        print(s["id"], s["outcome"], s.get("rmsePx"), s.get("passed"))


if __name__ == "__main__":
    main()
