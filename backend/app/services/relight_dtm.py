import rasterio
import numpy as np
import cv2

DTM = r"data\vikram_site\nac_dtm\vikram_landing_site_dtm.tif"

OUTPUT = (
    r"data\vikram_site\nac_dtm"
    r"\vikram_landing_site_synthetic_relight.png"
)

# --------------------------------------------------
# Synthetic Sun parameters
# --------------------------------------------------

SUN_AZIMUTH = 315       # degrees
SUN_ELEVATION = 30      # degrees

with rasterio.open(DTM) as src:
    elevation = src.read(1, masked=True)

    pixel_x = abs(src.transform.a)
    pixel_y = abs(src.transform.e)

mask = elevation.mask
z = elevation.filled(np.nan).astype(np.float32)

# --------------------------------------------------
# Calculate terrain gradients
# --------------------------------------------------

dz_dy, dz_dx = np.gradient(
    z,
    pixel_y,
    pixel_x
)

# Slope
slope = np.arctan(
    np.sqrt(
        dz_dx ** 2 +
        dz_dy ** 2
    )
)

# Terrain aspect
aspect = np.arctan2(
    -dz_dx,
    dz_dy
)

# --------------------------------------------------
# Convert Sun geometry to radians
# --------------------------------------------------

sun_azimuth = np.radians(SUN_AZIMUTH)
sun_elevation = np.radians(SUN_ELEVATION)

# --------------------------------------------------
# Lambertian illumination model
# --------------------------------------------------

illumination = (
    np.sin(sun_elevation) * np.cos(slope)
    +
    np.cos(sun_elevation)
    * np.sin(slope)
    * np.cos(sun_azimuth - aspect)
)

# Only illuminated surfaces contribute
illumination = np.maximum(
    illumination,
    0
)

# --------------------------------------------------
# Normalize for visualization
# --------------------------------------------------

valid = illumination[np.isfinite(illumination)]

low = np.percentile(valid, 2)
high = np.percentile(valid, 98)

relit = np.clip(
    (illumination - low)
    / (high - low)
    * 255,
    0,
    255
)

relit = np.nan_to_num(
    relit,
    nan=0
).astype(np.uint8)

# Preserve DTM NoData
relit[mask] = 0

# Upscale for viewing
preview = cv2.resize(
    relit,
    (1000, 1000),
    interpolation=cv2.INTER_LINEAR
)

cv2.imwrite(
    OUTPUT,
    preview
)

print("=" * 50)
print("SYNTHETIC TERRAIN RELIGHTING COMPLETE")
print("=" * 50)

print("Output:")
print(OUTPUT)

print()
print("Sun azimuth:", SUN_AZIMUTH, "degrees")
print("Sun elevation:", SUN_ELEVATION, "degrees")
print("DTM resolution:", pixel_x, "m/pixel")

print()
print("Important:")
print("This is a synthetic illumination experiment.")
print("The Sun geometry is diagnostic, not the actual")
print("spacecraft acquisition illumination.")