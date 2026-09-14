import numpy as np
import cv2

RAW = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc.raw"
OUTPUT = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc.png"

WIDTH = 7692
HEIGHT = 7692

image = np.memmap(
    RAW,
    dtype=np.uint8,
    mode="r",
    shape=(HEIGHT, WIDTH)
)

# Robust contrast stretch
low = np.percentile(image, 2)
high = np.percentile(image, 98)

preview = np.clip(
    (image.astype(np.float32) - low) /
    (high - low) * 255,
    0,
    255
).astype(np.uint8)

# Resize for easy viewing
preview = cv2.resize(
    preview,
    (1200, 1200),
    interpolation=cv2.INTER_AREA
)

cv2.imwrite(OUTPUT, preview)

print("Preview created:")
print(OUTPUT)
print("Original:", WIDTH, "x", HEIGHT)
print("Preview:", 1200, "x", 1200)
print("Contrast range:", low, "-", high)