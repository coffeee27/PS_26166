import rasterio
from pyproj import CRS, Transformer

ORTHO = r"data\vikram_site\nac_ortho\NAC_DTM_VIKRAMSITE1_M1442997156_100CM.IMG"

LAT = -69.374
LON = 32.32

# Moon polar stereographic CRS used by the NASA orthophoto
moon_crs = CRS.from_proj4(
    "+proj=stere "
    "+lat_0=-90 "
    "+lat_ts=-69.3 "
    "+lon_0=32.3 "
    "+a=1737400 "
    "+b=1737400 "
    "+units=m "
    "+no_defs"
)

transformer = Transformer.from_crs(
    CRS.from_epsg(4326),
    moon_crs,
    always_xy=True
)

with rasterio.open(ORTHO) as src:

    x, y = transformer.transform(LON, LAT)

    print("Projected landing coordinates:")
    print("X:", x)
    print("Y:", y)

    row, col = src.index(x, y)

    print("\nLanding site pixel:")
    print("Row:", row)
    print("Column:", col)

    print("\nImage dimensions:")
    print("Width:", src.width)
    print("Height:", src.height)

    print("\nInside image:", 0 <= row < src.height and 0 <= col < src.width)