import cv2
import numpy as np
import rasterio

OHRC = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc_1m.tif"
NASA = r"data\vikram_site\nac_ortho\vikram_landing_site_2km.tif"

OUTPUT = r"data\vikram_site\ohrc\vikram_landing_site_registered.tif"
OVERLAY = r"data\vikram_site\ohrc\registration_overlay.jpg"


# --------------------------------------------------
# 1. Load OHRC
# --------------------------------------------------

source = cv2.imread(
    OHRC,
    cv2.IMREAD_GRAYSCALE
)

if source is None:
    raise RuntimeError("Could not load OHRC image")


# --------------------------------------------------
# 2. Load NASA correctly as 16-bit
# --------------------------------------------------

with rasterio.open(NASA) as src:
    nasa_16bit = src.read(1)


# Normalize NASA for feature matching
low = np.percentile(nasa_16bit, 2)
high = np.percentile(nasa_16bit, 98)

reference = np.clip(
    (nasa_16bit.astype(np.float32) - low)
    / (high - low) * 255,
    0,
    255
).astype(np.uint8)


# --------------------------------------------------
# 3. Detect SIFT features
# --------------------------------------------------

sift = cv2.SIFT_create(
    nfeatures=5000
)

source_kp, source_desc = sift.detectAndCompute(
    source,
    None
)

reference_kp, reference_desc = sift.detectAndCompute(
    reference,
    None
)

print("OHRC features:", len(source_kp))
print("NASA features:", len(reference_kp))


# --------------------------------------------------
# 4. Match features
# --------------------------------------------------

bf = cv2.BFMatcher(cv2.NORM_L2)

knn_matches = bf.knnMatch(
    source_desc,
    reference_desc,
    k=2
)

good_matches = []

for pair in knn_matches:

    if len(pair) < 2:
        continue

    m, n = pair

    if m.distance < 0.75 * n.distance:
        good_matches.append(m)


print("Good matches:", len(good_matches))


# --------------------------------------------------
# 5. Estimate homography
# --------------------------------------------------

source_points = np.float32([
    source_kp[m.queryIdx].pt
    for m in good_matches
]).reshape(-1, 1, 2)

reference_points = np.float32([
    reference_kp[m.trainIdx].pt
    for m in good_matches
]).reshape(-1, 1, 2)


H, mask = cv2.findHomography(
    source_points,
    reference_points,
    cv2.RANSAC,
    5.0
)

if H is None:
    raise RuntimeError("Homography estimation failed")


inlier_mask = mask.ravel().astype(bool)

inlier_count = int(np.sum(inlier_mask))
inlier_ratio = inlier_count / len(good_matches)

print("Inliers:", inlier_count)
print("Inlier ratio:", inlier_ratio)


# --------------------------------------------------
# 6. Calculate registration error
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

rmse = float(
    np.sqrt(np.mean(errors ** 2))
)

max_error = float(np.max(errors))

print("RMSE:", rmse)
print("Max error:", max_error)


# --------------------------------------------------
# 7. Warp OHRC → NASA
# --------------------------------------------------

height, width = reference.shape

registered = cv2.warpPerspective(
    source,
    H,
    (width, height)
)


# --------------------------------------------------
# 8. Save registered image
# --------------------------------------------------

cv2.imwrite(
    OUTPUT,
    registered
)

print()
print("REGISTERED IMAGE CREATED:")
print(OUTPUT)


# --------------------------------------------------
# 9. Create visual overlay
# --------------------------------------------------

# NASA is reference
# Registered OHRC is the moving image

overlay = cv2.addWeighted(
    reference,
    0.5,
    registered,
    0.5,
    0
)

cv2.imwrite(
    OVERLAY,
    overlay
)

print()
print("OVERLAY CREATED:")
print(OVERLAY)


# --------------------------------------------------
# 10. Final summary
# --------------------------------------------------

print()
print("=" * 50)
print("REAL REGISTRATION COMPLETE")
print("=" * 50)

print("Good matches :", len(good_matches))
print("Inliers      :", inlier_count)
print("Inlier ratio :", f"{inlier_ratio:.4f}")
print("RMSE         :", f"{rmse:.4f} pixels")
print("Max error    :", f"{max_error:.4f} pixels")