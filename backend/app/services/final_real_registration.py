import cv2
import numpy as np
import rasterio

OHRC = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc_1m.tif"
NASA = r"data\vikram_site\nac_ortho\vikram_landing_site_2km.tif"

REGISTERED = (
    r"data\vikram_site\ohrc"
    r"\vikram_landing_site_registered_subpixel.tif"
)

OVERLAY = (
    r"data\vikram_site\ohrc"
    r"\registration_overlay_subpixel.jpg"
)

RATIO = 0.65
RANSAC_THRESHOLD = 3.0


# --------------------------------------------------
# Load OHRC
# --------------------------------------------------

source = cv2.imread(
    OHRC,
    cv2.IMREAD_GRAYSCALE
)

if source is None:
    raise RuntimeError("Could not load OHRC image")


# --------------------------------------------------
# Load NASA 16-bit image correctly
# --------------------------------------------------

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
# KNN matching
# --------------------------------------------------

bf = cv2.BFMatcher(cv2.NORM_L2)

knn_matches = bf.knnMatch(
    source_desc,
    reference_desc,
    k=2
)


# --------------------------------------------------
# Strict Lowe ratio test
# --------------------------------------------------

good_matches = []

for pair in knn_matches:

    if len(pair) < 2:
        continue

    m, n = pair

    if m.distance < RATIO * n.distance:
        good_matches.append(m)

print("Good matches:", len(good_matches))


if len(good_matches) < 4:
    raise RuntimeError("Not enough matches for homography")


# --------------------------------------------------
# Match coordinates
# --------------------------------------------------

source_points = np.float32([
    source_kp[m.queryIdx].pt
    for m in good_matches
]).reshape(-1, 1, 2)

reference_points = np.float32([
    reference_kp[m.trainIdx].pt
    for m in good_matches
]).reshape(-1, 1, 2)


# --------------------------------------------------
# RANSAC homography
# --------------------------------------------------

H, mask = cv2.findHomography(
    source_points,
    reference_points,
    cv2.RANSAC,
    RANSAC_THRESHOLD
)

if H is None:
    raise RuntimeError("Homography estimation failed")


inlier_mask = mask.ravel().astype(bool)

inlier_count = int(np.sum(inlier_mask))

inlier_ratio = (
    inlier_count / len(good_matches)
)


# --------------------------------------------------
# Registration error
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

max_error = float(
    np.max(errors)
)


# --------------------------------------------------
# Spatial coverage
# --------------------------------------------------

height, width = source.shape

grid_rows = 4
grid_cols = 4

occupied = set()

for match, is_inlier in zip(
    good_matches,
    inlier_mask
):

    if not is_inlier:
        continue

    x, y = source_kp[match.queryIdx].pt

    col = min(
        int(x / width * grid_cols),
        grid_cols - 1
    )

    row = min(
        int(y / height * grid_rows),
        grid_rows - 1
    )

    occupied.add((row, col))

spatial_coverage = (
    len(occupied)
    / (grid_rows * grid_cols)
)


# --------------------------------------------------
# Warp OHRC into NASA frame
# --------------------------------------------------

registered = cv2.warpPerspective(
    source,
    H,
    (reference.shape[1], reference.shape[0])
)


# --------------------------------------------------
# Save registered image
# --------------------------------------------------

cv2.imwrite(
    REGISTERED,
    registered
)


# --------------------------------------------------
# Create overlay
# --------------------------------------------------

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


# --------------------------------------------------
# Results
# --------------------------------------------------

print()
print("=" * 60)
print("FINAL REAL SUB-PIXEL REGISTRATION")
print("=" * 60)

print("Lowe ratio       :", RATIO)
print("RANSAC threshold :", RANSAC_THRESHOLD, "pixels")
print()
print("Good matches     :", len(good_matches))
print("Inliers          :", inlier_count)
print("Inlier ratio     :", f"{inlier_ratio:.4f}")
print("RMSE             :", f"{rmse:.4f}", "pixels")
print("Max error        :", f"{max_error:.4f}", "pixels")
print("Spatial coverage :", f"{spatial_coverage:.4f}")

print()
print("Registered image:")
print(REGISTERED)

print()
print("Overlay:")
print(OVERLAY)

print()
print("Sub-pixel target:")
print(
    "ACHIEVED"
    if rmse < 1.0
    else "NOT ACHIEVED"
)