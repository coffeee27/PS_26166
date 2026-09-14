import numpy as np
import rasterio
from rasterio.transform import from_origin

RAW = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc.raw"
OUTPUT = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc.tif"

WIDTH = 7692
HEIGHT = 7692
RESOLUTION = 0.26

image = np.memmap(
    RAW,
    dtype=np.uint8,
    mode="r",
    shape=(HEIGHT, WIDTH)
)

profile = {
    "driver": "GTiff",
    "width": WIDTH,
    "height": HEIGHT,
    "count": 1,
    "dtype": "uint8",
    "compress": "lzw",
}

with rasterio.open(OUTPUT, "w", **profile) as dst:
    dst.write(image, 1)

print("OHRC TIFF created:")
print(OUTPUT)
print("Size:", WIDTH, "x", HEIGHT)
print("Resolution:", RESOLUTION, "m/pixel")