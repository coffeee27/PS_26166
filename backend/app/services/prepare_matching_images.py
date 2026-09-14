import cv2

OHRC = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc.tif"
OUTPUT = r"data\vikram_site\ohrc\vikram_landing_site_2km_ohrc_1m.tif"

image = cv2.imread(OHRC, cv2.IMREAD_GRAYSCALE)

if image is None:
    raise RuntimeError("Could not read OHRC TIFF")

target_size = (2000, 2000)

resized = cv2.resize(
    image,
    target_size,
    interpolation=cv2.INTER_AREA
)

cv2.imwrite(OUTPUT, resized)

print("Prepared OHRC matching image:")
print(OUTPUT)
print("Size:", resized.shape[1], "x", resized.shape[0])
print("Approximate resolution: 1 m/pixel")