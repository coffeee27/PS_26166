import cv2
import numpy as np

# OHRC image dimensions
WIDTH = 12000
HEIGHT = 93693

# Target landing site
TARGET_LON = 32.32
TARGET_LAT = -69.374

# Refined geographic coordinates of OHRC image corners
# Order: upper-left, upper-right, lower-left, lower-right

geo_points = np.array([
    [32.241185, -69.015312],  # UL
    [32.533886, -69.018705],  # UR
    [32.126886, -69.845296],  # LL
    [32.430004, -69.850788],  # LR
], dtype=np.float32)

# Corresponding image pixel coordinates
pixel_points = np.array([
    [0, 0],                    # UL
    [WIDTH - 1, 0],            # UR
    [0, HEIGHT - 1],           # LL
    [WIDTH - 1, HEIGHT - 1],   # LR
], dtype=np.float32)

# Find geographic -> pixel transformation
H, mask = cv2.findHomography(
    geo_points,
    pixel_points
)

if H is None:
    raise RuntimeError("Could not calculate geographic-to-pixel mapping")

# Convert target lon/lat to pixel coordinates
target = np.array(
    [[[TARGET_LON, TARGET_LAT]]],
    dtype=np.float32
)

pixel = cv2.perspectiveTransform(target, H)

x, y = pixel[0, 0]

print("OHRC landing site pixel:")
print("Column:", x)
print("Row:", y)

print()
print("Image dimensions:")
print("Width:", WIDTH)
print("Height:", HEIGHT)

print()
print("Inside image:", 0 <= x < WIDTH and 0 <= y < HEIGHT)

# Approximate physical distance from image origin
print()
print("Approximate position:")
print("X distance:", x * 0.26, "meters")
print("Y distance:", y * 0.26, "meters")