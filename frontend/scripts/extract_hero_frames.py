"""Split the landing-page hero video into WebP frame sequences.

The hero scrubs through the animation as the user scrolls, drawing one frame at a
time onto a canvas. Seeking an <video> element per scroll tick stutters on most
browsers, so the frames are pre-extracted instead.

Usage (from the frontend/ folder):
    python scripts/extract_hero_frames.py "path/to/hero.mp4"

Writes public/hero/1920/0001.webp ... and public/hero/960/0001.webp ...
Re-run whenever the video changes, then update HERO_FRAME_COUNT in
src/components/landing/ScrollVideoHero.tsx if the frame count changed.
"""
import shutil
import sys
from pathlib import Path

import cv2

# (output width, WebP quality). 960 is served to small screens.
SIZES = ((1920, 80), (960, 75))
OUT_ROOT = Path(__file__).resolve().parent.parent / "public" / "hero"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    source = Path(sys.argv[1])
    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        sys.exit(f"Could not open video: {source}")

    for width, _ in SIZES:
        target = OUT_ROOT / str(width)
        shutil.rmtree(target, ignore_errors=True)
        target.mkdir(parents=True)

    count = 0
    total_bytes = 0
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        count += 1
        for width, quality in SIZES:
            height = round(frame.shape[0] * width / frame.shape[1])
            resized = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            ok, buffer = cv2.imencode(".webp", resized, [cv2.IMWRITE_WEBP_QUALITY, quality])
            if not ok:
                sys.exit(f"WebP encoding failed at frame {count}")
            path = OUT_ROOT / str(width) / f"{count:04d}.webp"
            path.write_bytes(buffer.tobytes())
            total_bytes += len(buffer)

    capture.release()
    print(f"Extracted {count} frames into {OUT_ROOT} ({total_bytes / 1e6:.2f} MB total)")
    print(f"Set HERO_FRAME_COUNT = {count} in ScrollVideoHero.tsx")


if __name__ == "__main__":
    main()
