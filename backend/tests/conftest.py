import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

DATA = Path(__file__).resolve().parent / "data"


@pytest.fixture(scope="session")
def lunar_texture() -> np.ndarray:
    """A 500x560 grey crater texture (float32) used as the ground-truth scene."""
    image = cv2.imread(str(DATA / "lunar_texture.webp"), cv2.IMREAD_GRAYSCALE)
    assert image is not None, "missing tests/data/lunar_texture.webp"
    return image.astype(np.float32)


@pytest.fixture
def rng() -> np.random.Generator:
    return np.random.default_rng(42)
