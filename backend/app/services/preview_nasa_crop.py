import rasterio
import numpy as np
import cv2

INPUT = r"data\vikram_site\nac_ortho\vikram_landing_site_2km.tif"
OUTPUT = r"data\vikram_site\nac_ortho\vikram_landing_site_2km_nasa.png"

with rasterio.open(INPUT) as src:
    image = src.read(1)

# Ignore invalid/no-data values
valid = image[np.isfinite(image)]

low = np.percentile(valid, 2)
high = np.percentile(valid, 98)

preview = np.clip(
    (image.astype(np.float32) - low) /
    (high - low) * 255,
    0,
    255
).astype(np.uint8)

preview = cv2.resize(
    preview,
    (1200, 1200),
    interpolation=cv2.INTER_AREA
)

cv2.imwrite(OUTPUT, preview)

print("NASA preview created:")
print(OUTPUT)
print("Original:", image.shape[1], "x", image.shape[0])
print("Preview: 1200 x 1200")
print("Contrast range:", low, "-", high)