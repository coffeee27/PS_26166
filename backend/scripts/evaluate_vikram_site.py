"""Honest accuracy check on the real Vikram landing-site pair (OHRC -> LRO NAC).

1. Baseline: SIFT + Lowe ratio + RANSAC homography, as in
   app/services/final_real_registration.py, reporting the RMSE on its own
   inliers (what that script prints) and the held-out RMSE.
2. Engine: app.registration.pipeline.register (coarse matching, NCC sub-pixel
   tie points, model selection), with every candidate model's held-out RMSE.

"random" is 5-fold cross-validation over points. "blocks" holds out whole
spatial blocks (4x4), so the model is judged on ground it never saw; this is
the figure to quote, because random folds always leave a neighbouring point in
the training set.

Run from backend/:  python scripts/evaluate_vikram_site.py [--save]
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.registration.geometry import fit_homography, spatial_blocks  # noqa: E402
from app.registration.imaging import load_image, normalize_to_uint8  # noqa: E402
from app.registration.metrics import holdout_rmse, point_errors, rmse, spatial_coverage  # noqa: E402
from app.registration.pipeline import register, warp_to_reference  # noqa: E402

SITE = BACKEND / "data" / "vikram_site"
OHRC = SITE / "ohrc" / "vikram_landing_site_2km_ohrc_1m.tif"
NASA = SITE / "nac_ortho" / "vikram_landing_site_2km.tif"
OUTPUT = SITE / "engine"

RATIO = 0.65
RANSAC_THRESHOLD = 3.0


def sift_baseline(source: np.ndarray, reference: np.ndarray):
    sift = cv2.SIFT_create(nfeatures=5000)
    source_kp, source_desc = sift.detectAndCompute(source, None)
    reference_kp, reference_desc = sift.detectAndCompute(reference, None)
    pairs = cv2.BFMatcher(cv2.NORM_L2).knnMatch(source_desc, reference_desc, k=2)
    good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < RATIO * n.distance]

    src = np.float64([source_kp[m.queryIdx].pt for m in good])
    ref = np.float64([reference_kp[m.trainIdx].pt for m in good])
    H, mask = cv2.findHomography(src, ref, cv2.RANSAC, RANSAC_THRESHOLD)
    inliers = mask.ravel().astype(bool)
    return src[inliers], ref[inliers], H, len(good)


def main() -> None:
    ohrc = load_image(OHRC)
    nasa = load_image(NASA)
    gsd = nasa.metadata.get("gsd")
    print(f"OHRC {ohrc.shape} {ohrc.source_dtype} | NAC {nasa.shape} {nasa.source_dtype}, {gsd:.2f} m/px")
    print("All errors in reference pixels.")

    src, ref, H_src_to_ref, good = sift_baseline(normalize_to_uint8(ohrc.data, 2, 98), normalize_to_uint8(nasa.data, 2, 98))
    script_errors = point_errors(cv2.perspectiveTransform(src.reshape(-1, 1, 2), H_src_to_ref).reshape(-1, 2), ref)
    random = holdout_rmse(ref, src, fit_homography)
    blocks = holdout_rmse(ref, src, fit_homography, groups=spatial_blocks(ref, nasa.shape))
    coverage = spatial_coverage(ref, nasa.shape)
    print(f"\n1. Baseline SIFT + RANSAC: {good} ratio-test matches, {len(src)} inliers")
    print(f"   RMSE printed by final_real_registration.py : {rmse(script_errors):.3f} px (on its own inliers)")
    print(f"   held-out RMSE, random / blocks             : {random.rmse:.3f} / {blocks.rmse:.3f} px")
    print(f"   coverage 8x8 {coverage.coverage:.2f}, uniformity {coverage.uniformity:.2f}")

    result = register(nasa.data, ohrc.data, reference_gsd=gsd)
    summary = result.summary()
    print(f"\n2. Engine: {summary['putative_matches']} matches, {summary['coarse_inliers']} MAGSAC++ inliers, "
          f"{summary['tie_points']} sub-pixel tie points, {summary['total_seconds']} s")
    print(f"   coverage 8x8 {summary['coverage']:.2f}, uniformity {summary['uniformity']:.2f}")
    print("   block hold-out RMSE per model:")
    for name, value in result.model_rmse.items():
        marker = "  <- selected" if name == result.model else ""
        print(f"     {name:<13} {value:.3f} px{marker}")
    metres = f" = {result.holdout_rmse_m:.2f} m" if result.holdout_rmse_m is not None else ""
    print(f"   result: {result.model}, held-out RMSE {result.holdout_rmse:.3f} px{metres} (fit {result.fit_rmse:.3f} px)")

    if "--save" in sys.argv:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        warped = warp_to_reference(ohrc.data, result.mapping, nasa.shape)
        registered = normalize_to_uint8(warped)
        reference8 = normalize_to_uint8(nasa.data)
        cv2.imwrite(str(OUTPUT / "registered_ohrc.png"), registered)
        cv2.imwrite(str(OUTPUT / "overlay.png"), cv2.merge([reference8, registered, reference8]))
        print(f"\n   saved registered image and magenta/green overlay to {OUTPUT}")


if __name__ == "__main__":
    main()
