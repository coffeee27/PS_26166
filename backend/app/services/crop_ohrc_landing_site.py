import numpy as np
from pathlib import Path

OHRC = Path(
    r"data\vikram_site\ohrc\ch2_ohr_ncp_20240425T1209509264_d_img_d18.img"
)

OUTPUT = Path(
    r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc.raw"
)

# OHRC image dimensions
WIDTH = 12000
HEIGHT = 93693

# Landing-site pixel
CENTER_COL = 5173
CENTER_ROW = 41106

# NASA crop = 2 km
# OHRC resolution = 0.26 m/pixel
CROP_SIZE = 7692

# OHRC is 8-bit according to the product metadata
DTYPE = np.uint8

print("Reading OHRC image...")

# Memory-map instead of loading the entire ~1.1 GB image
image = np.memmap(
    OHRC,
    dtype=DTYPE,
    mode="r",
    shape=(HEIGHT, WIDTH)
)

half = CROP_SIZE // 2

row_start = CENTER_ROW - half
row_end = row_start + CROP_SIZE

col_start = CENTER_COL - half
col_end = col_start + CROP_SIZE

print("Crop coordinates:")
print("Rows:", row_start, "to", row_end)
print("Columns:", col_start, "to", col_end)

crop = np.array(
    image[row_start:row_end, col_start:col_end]
)

crop.tofile(OUTPUT)

print()
print("OHRC crop created:")
print(OUTPUT)

print("Size:", crop.shape[1], "x", crop.shape[0])
print("Resolution: 0.26 m/pixel")
print("Physical size:", CROP_SIZE * 0.26, "m x", CROP_SIZE * 0.26, "m")