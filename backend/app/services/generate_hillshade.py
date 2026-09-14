import rasterio
import numpy as np
import cv2

DTM = r"data\vikram_site\nac_dtm\vikram_landing_site_dtm.tif"
OUTPUT = r"data\vikram_site\nac_dtm\vikram_landing_site_hillshade_enhanced.png"

AZIMUTH = 315
SUN_ELEVATION = 30

with rasterio.open(DTM) as src:
    elevation = src.read(1, masked=True)

    pixel_x = abs(src.transform.a)
    pixel_y = abs(src.transform.e)

# Preserve NoData mask
mask = elevation.mask
elevation = elevation.filled(np.nan)

# Terrain gradients
dz_dy, dz_dx = np.gradient(
    elevation,
    pixel_y,
    pixel_x
)

slope = np.arctan(
    np.sqrt(dz_dx ** 2 + dz_dy ** 2)
)

aspect = np.arctan2(
    -dz_dx,
    dz_dy
)

azimuth = np.radians(AZIMUTH)
sun_elevation = np.radians(SUN_ELEVATION)

hillshade = (
    np.sin(sun_elevation) * np.cos(slope)
    +
    np.cos(sun_elevation)
    * np.sin(slope)
    * np.cos(azimuth - aspect)
)

# Convert to 0-255
hillshade = (hillshade + 1) / 2 * 255

# Contrast enhancement
valid = hillshade[np.isfinite(hillshade)]

low = np.percentile(valid, 5)
high = np.percentile(valid, 95)

enhanced = np.clip(
    (hillshade - low) /
    (high - low) * 255,
    0,
    255
)

enhanced = np.nan_to_num(
    enhanced,
    nan=0
).astype(np.uint8)

# Mark original NoData as black
enhanced[mask] = 0

# Resize
preview = cv2.resize(
    enhanced,
    (1000, 1000),
    interpolation=cv2.INTER_LINEAR
)

cv2.imwrite(
    OUTPUT,
    preview
)

print("Enhanced hillshade created:")
print(OUTPUT)

print()
print("Illumination:")
print("Azimuth:", AZIMUTH, "degrees")
print("Sun elevation:", SUN_ELEVATION, "degrees")

print()
print("Hillshade contrast:")
print("Low:", low)
print("High:", high)