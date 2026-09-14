import rasterio
import numpy as np

DTM = r"data\vikram_site\nac_dtm\vikram_landing_site_dtm.tif"

with rasterio.open(DTM) as src:
    elevation = src.read(1, masked=True)

    # DTM resolution
    pixel_size_x = abs(src.transform.a)
    pixel_size_y = abs(src.transform.e)

elevation_data = elevation.filled(np.nan)

# Calculate elevation statistics
valid = elevation_data[np.isfinite(elevation_data)]

print("DTM TERRAIN ANALYSIS")
print("=" * 40)

print(f"Resolution: {pixel_size_x:.2f} m/pixel")
print(f"Minimum elevation: {np.min(valid):.2f} m")
print(f"Maximum elevation: {np.max(valid):.2f} m")
print(f"Mean elevation: {np.mean(valid):.2f} m")
print(f"Elevation relief: {np.max(valid) - np.min(valid):.2f} m")

# Calculate terrain gradients
dz_dy, dz_dx = np.gradient(
    elevation_data,
    pixel_size_y,
    pixel_size_x
)

# Slope in degrees
slope = np.degrees(
    np.arctan(
        np.sqrt(
            dz_dx ** 2 +
            dz_dy ** 2
        )
    )
)

valid_slope = slope[np.isfinite(slope)]

print()
print("SLOPE")
print("=" * 40)

print(f"Minimum slope: {np.min(valid_slope):.2f} degrees")
print(f"Maximum slope: {np.max(valid_slope):.2f} degrees")
print(f"Mean slope: {np.mean(valid_slope):.2f} degrees")
print(f"Median slope: {np.median(valid_slope):.2f} degrees")