import rasterio
from rasterio.windows import Window

DTM = r"data\vikram_site\nac_dtm\NAC_DTM_VIKRAMSITE1.TIF"
OUTPUT = r"data\vikram_site\nac_dtm\vikram_landing_site_dtm.tif"

# Projected landing-site coordinates obtained earlier
LANDING_X = 213.58764039099833
LANDING_Y = 611883.4926759006

# DTM resolution
RESOLUTION = 3.0

# 2 km physical area
CROP_METERS = 2000
CROP_PIXELS = int(CROP_METERS / RESOLUTION)

with rasterio.open(DTM) as src:

    # Convert projected coordinates to DTM pixel
    col = int((LANDING_X - src.bounds.left) / RESOLUTION)
    row = int((src.bounds.top - LANDING_Y) / RESOLUTION)

    print("Landing-site DTM pixel:")
    print("Column:", col)
    print("Row:", row)

    half = CROP_PIXELS // 2

    col_start = col - half
    row_start = row - half

    window = Window(
        col_start,
        row_start,
        CROP_PIXELS,
        CROP_PIXELS
    )

    data = src.read(1, window=window)

    profile = src.profile.copy()

    profile.update(
        driver="GTiff",
        width=CROP_PIXELS,
        height=CROP_PIXELS,
        transform=src.window_transform(window),
        compress="lzw"
    )

    with rasterio.open(OUTPUT, "w", **profile) as dst:
        dst.write(data, 1)

print()
print("DTM landing-site crop created:")
print(OUTPUT)

print("Size:", CROP_PIXELS, "x", CROP_PIXELS)
print(
    "Physical size:",
    CROP_PIXELS * RESOLUTION,
    "m x",
    CROP_PIXELS * RESOLUTION,
    "m"
)