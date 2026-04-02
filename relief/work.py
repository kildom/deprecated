
from utils import DEBUG
from pathlib import Path

import numpy as np

from utils import DepthMap, debug
from PIL import Image

class Work:

    pixels_per_mm: float
    mm_per_pixel: float
    total_depth_mm: float
    total_depth: float
    width_mm: float
    height_mm: float
    width: int
    height: int
    depth_map: DepthMap

    def __init__(self, depth_map: np.ndarray, width_mm: float, total_depth_mm: float):
        self.width = depth_map.shape[1]
        self.height = depth_map.shape[0]
        self.width_mm = width_mm
        self.total_depth_mm = total_depth_mm
        self.pixels_per_mm = self.width / self.width_mm
        self.mm_per_pixel = self.width_mm / self.width
        self.total_depth = total_depth_mm * self.pixels_per_mm
        self.height_mm = self.height * self.mm_per_pixel
        self.depth_map = self._normalize_depth_map(depth_map)
        debug("Depth (px):", self.total_depth)
        self.debug_image('Work-depth_map.png', self.depth_map)

    def _normalize_depth_map(self, array: np.ndarray) -> DepthMap:
        if len(array.shape) == 3:  # Color image
            array = np.sum(array, axis=2)  # Convert to grayscale by summing RGB channels
        array = array.astype(np.float32)
        array = array - np.min(array)  # Shift values to start from 0
        array = array / np.max(array)  # Normalize to range [0, 1]
        array = array * self.total_depth
        return array

    def debug_image(self, filename: str, r: DepthMap, g: DepthMap | None = None, b: DepthMap | None = None):
        if not DEBUG:
            return
        if g is not None or b is not None:
            g = g if g is not None else np.zeros_like(r)
            b = b if b is not None else np.zeros_like(r)
            r = np.stack([r.astype(np.float32), g.astype(np.float32), b.astype(np.float32)], axis=-1)
        if self.total_depth * self.mm_per_pixel * 10000 < 64000:
            r = r * self.mm_per_pixel * 10000
        elif self.total_depth * self.mm_per_pixel * 1000 < 64000:
            r = r * self.mm_per_pixel * 1000
        else:
            r = r * self.mm_per_pixel * 100
        file = (Path('.') / 'debug' / filename)
        file.parent.mkdir(exist_ok=True)
        print(r)
        Image.fromarray(r.astype(np.uint16)).save(file)
