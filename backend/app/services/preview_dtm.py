import rasterio
import numpy as np
import cv2

DTM = r"data\vikram_site\nac_dtm\NAC_DTM_VIKRAMSITE1.TIF"
OUTPUT = r"data\vikram_site\nac_dtm\vikram_site_dtm_preview.png"

with rasterio.open(DTM) as src:
    elevation = src.read(1, masked=True)

# Convert masked array to float
elevation = elevation.astype(np.float32)

# Get valid elevation range
valid = elevation.compressed()

low = np.percentile(valid, 2)
high = np.percentile(valid, 98)

print("DTM elevation range:")
print("Minimum:", float(valid.min()), "m")
print("Maximum:", float(valid.max()), "m")
print("2nd percentile:", float(low), "m")
print("98th percentile:", float(high), "m")

# Normalize elevation to 0-255
normalized = np.clip(
    (elevation.filled(low) - low) /
    (high - low) * 255,
    0,
    255
).astype(np.uint8)

# Resize for convenient viewing
preview = cv2.resize(
    normalized,
    (1000, 1000),
    interpolation=cv2.INTER_AREA
)

cv2.imwrite(OUTPUT, preview)

print()
print("DTM preview created:")
print(OUTPUT)