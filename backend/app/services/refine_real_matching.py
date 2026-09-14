import cv2
import numpy as np
import rasterio

OHRC = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc_1m.tif"
NASA = r"data\vikram_site\nac_ortho\vikram_landing_site_2km.tif"


# --------------------------------------------------
# Load images
# --------------------------------------------------

source = cv2.imread(OHRC, cv2.IMREAD_GRAYSCALE)

with rasterio.open(NASA) as src:
    nasa = src.read(1)

low = np.percentile(nasa, 2)
high = np.percentile(nasa, 98)

reference = np.clip(
    (nasa.astype(np.float32) - low)
    / (high - low) * 255,
    0,
    255
).astype(np.uint8)


# --------------------------------------------------
# SIFT
# --------------------------------------------------

sift = cv2.SIFT_create(nfeatures=5000)

source_kp, source_desc = sift.detectAndCompute(
    source, None
)

reference_kp, reference_desc = sift.detectAndCompute(
    reference, None
)

bf = cv2.BFMatcher(cv2.NORM_L2)

knn_matches = bf.knnMatch(
    source_desc,
    reference_desc,
    k=2
)


# --------------------------------------------------
# Test multiple ratio thresholds
# --------------------------------------------------

for ratio in [0.75, 0.70, 0.65]:

    good_matches = []

    for pair in knn_matches:

        if len(pair) < 2:
            continue

        m, n = pair

        if m.distance < ratio * n.distance:
            good_matches.append(m)

    if len(good_matches) < 4:
        print(f"Ratio {ratio}: not enough matches")
        continue

    source_points = np.float32([
        source_kp[m.queryIdx].pt
        for m in good_matches
    ]).reshape(-1, 1, 2)

    reference_points = np.float32([
        reference_kp[m.trainIdx].pt
        for m in good_matches
    ]).reshape(-1, 1, 2)

    # Stricter RANSAC threshold
    H, mask = cv2.findHomography(
        source_points,
        reference_points,
        cv2.RANSAC,
        3.0
    )

    if H is None:
        print(f"Ratio {ratio}: homography failed")
        continue

    inlier_mask = mask.ravel().astype(bool)

    inlier_count = int(np.sum(inlier_mask))

    if inlier_count == 0:
        continue

    src_inliers = source_points[inlier_mask]
    ref_inliers = reference_points[inlier_mask]

    projected = cv2.perspectiveTransform(
        src_inliers,
        H
    )

    errors = np.sqrt(
        np.sum(
            (projected - ref_inliers) ** 2,
            axis=2
        )
    )

    rmse = float(
        np.sqrt(np.mean(errors ** 2))
    )

    max_error = float(np.max(errors))

    inlier_ratio = (
        inlier_count / len(good_matches)
    )

    print()
    print("=" * 50)
    print(f"RATIO TEST: {ratio}")
    print("=" * 50)

    print("Good matches :", len(good_matches))
    print("Inliers      :", inlier_count)
    print("Inlier ratio :", f"{inlier_ratio:.4f}")
    print("RMSE         :", f"{rmse:.4f} pixels")
    print("Max error    :", f"{max_error:.4f} pixels")