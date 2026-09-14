import cv2
import numpy as np

OHRC = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc_1m.tif"
NASA = r"data\vikram_site\nac_ortho\vikram_landing_site_2km.tif"

# --------------------------------------------------
# 1. Load images
# --------------------------------------------------

import rasterio

source = cv2.imread(OHRC, cv2.IMREAD_GRAYSCALE)

with rasterio.open(NASA) as src:
    nasa_16bit = src.read(1)

# Convert NASA 16-bit image to 8-bit for SIFT
low = np.percentile(nasa_16bit, 2)
high = np.percentile(nasa_16bit, 98)

reference = np.clip(
    (nasa_16bit.astype(np.float32) - low)
    / (high - low) * 255,
    0,
    255
).astype(np.uint8)

if source is None:
    raise RuntimeError("Could not load OHRC image")

if reference is None:
    raise RuntimeError("Could not load NASA image")

print("Images loaded:")
print("OHRC:", source.shape)
print("NASA:", reference.shape)

# --------------------------------------------------
# 2. Detect SIFT features
# --------------------------------------------------

sift = cv2.SIFT_create(
    nfeatures=5000
)

source_keypoints, source_descriptors = sift.detectAndCompute(
    source,
    None
)

reference_keypoints, reference_descriptors = sift.detectAndCompute(
    reference,
    None
)

print()
print("SIFT features:")
print("OHRC:", len(source_keypoints))
print("NASA:", len(reference_keypoints))

# --------------------------------------------------
# 3. Match descriptors
# --------------------------------------------------

bf = cv2.BFMatcher(cv2.NORM_L2)

knn_matches = bf.knnMatch(
    source_descriptors,
    reference_descriptors,
    k=2
)

# Lowe's ratio test
good_matches = []

for pair in knn_matches:
    if len(pair) < 2:
        continue

    m, n = pair

    if m.distance < 0.75 * n.distance:
        good_matches.append(m)

print()
print("Raw KNN matches:", len(knn_matches))
print("Good matches after ratio test:", len(good_matches))

# --------------------------------------------------
# 4. Estimate homography using RANSAC
# --------------------------------------------------

if len(good_matches) < 4:
    raise RuntimeError(
        f"Only {len(good_matches)} good matches. "
        "Not enough for homography."
    )

source_points = np.float32([
    source_keypoints[m.queryIdx].pt
    for m in good_matches
]).reshape(-1, 1, 2)

reference_points = np.float32([
    reference_keypoints[m.trainIdx].pt
    for m in good_matches
]).reshape(-1, 1, 2)

H, mask = cv2.findHomography(
    source_points,
    reference_points,
    cv2.RANSAC,
    5.0
)

if H is None or mask is None:
    raise RuntimeError("Homography estimation failed")

inlier_mask = mask.ravel().astype(bool)

inlier_count = int(np.sum(inlier_mask))
inlier_ratio = inlier_count / len(good_matches)

# --------------------------------------------------
# 5. Calculate RMSE
# --------------------------------------------------

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

rmse = float(np.sqrt(np.mean(errors ** 2)))
max_error = float(np.max(errors))

# --------------------------------------------------
# 6. Print results
# --------------------------------------------------

print()
print("=" * 50)
print("REAL LUNAR IMAGE MATCHING RESULTS")
print("=" * 50)

print(f"Good matches : {len(good_matches)}")
print(f"Inliers      : {inlier_count}")
print(f"Inlier ratio : {inlier_ratio:.4f}")
print(f"RMSE         : {rmse:.4f} pixels")
print(f"Max error    : {max_error:.4f} pixels")

print()
print("Homography:")
print(H)

# --------------------------------------------------
# 7. Save match visualization
# --------------------------------------------------

inlier_matches = [
    m
    for m, inlier in zip(good_matches, inlier_mask)
    if inlier
]

visualization = cv2.drawMatches(
    source,
    source_keypoints,
    reference,
    reference_keypoints,
    inlier_matches,
    None,
    flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
)

OUTPUT = r"data\vikram_site\real_inlier_matches.jpg"

cv2.imwrite(
    OUTPUT,
    visualization
)

print()
print("Inlier visualization saved:")
print(OUTPUT)