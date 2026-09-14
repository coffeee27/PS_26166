import rasterio
from rasterio.windows import Window

ORTHO = r"data\vikram_site\nac_ortho\NAC_DTM_VIKRAMSITE1_M1442997156_100CM.IMG"
OUTPUT = r"data\vikram_site\nac_ortho\vikram_landing_site_2km.tif"

CENTER_ROW = 26375
CENTER_COL = 11257

CROP_SIZE = 2000

with rasterio.open(ORTHO) as src:

    half = CROP_SIZE // 2

    row_start = CENTER_ROW - half
    col_start = CENTER_COL - half

    window = Window(
        col_start,
        row_start,
        CROP_SIZE,
        CROP_SIZE
    )

    data = src.read(window=window)

    profile = src.profile.copy()
    profile.update(
        width=CROP_SIZE,
        height=CROP_SIZE,
        transform=src.window_transform(window),
        driver="GTiff"
    )

    with rasterio.open(OUTPUT, "w", **profile) as dst:
        dst.write(data)

print("Crop created:")
print(OUTPUT)
print("Size:", CROP_SIZE, "x", CROP_SIZE)