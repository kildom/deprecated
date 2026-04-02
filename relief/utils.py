
import sys

import numpy as np
from pathlib import Path
from scipy import ndimage
from scipy.signal import convolve2d
from PIL import Image


DepthMap = np.ndarray[tuple[int, int], np.dtype[np.float32]]
DepthMap3D = np.ndarray[tuple[int, int, int], np.dtype[np.float32]]
Mask = np.ndarray[tuple[int, int], np.dtype[np.bool]]
Mask3D = np.ndarray[tuple[int, int, int], np.dtype[np.bool]]

DEBUG = True

def debug_print(*args, **kwargs):
    print(*args, **kwargs, file=sys.stderr)

debug = debug_print if DEBUG else lambda *args, **kwargs: None

def scale_channel(r: np.ndarray, name: str) -> np.ndarray:
    debug(f'    channel {name}: min={np.min(r)}, max={np.max(r)}')
    tmp = r - np.min(r)
    max_val = np.max(tmp)
    if max_val > 0:
        tmp = tmp / max_val
    else:
        tmp = np.zeros_like(tmp)
    return (tmp * 255).astype(np.uint8)


def debug_image(filename: str, r: np.ndarray, g: np.ndarray = None, b: np.ndarray = None, *, scale: bool = True):
    return
    if DEBUG:
        debug(f'Saving debug image: {filename}')
        file = (Path('.') / 'debug' / filename)
        file.parent.mkdir(exist_ok=True)
        r = scale_channel(r, 'R') if scale else r
        if g is not None:
            g = scale_channel(g, 'G') if scale else g
        else:
            g = r
        if b is not None:
            b = scale_channel(b, 'B') if scale else b
        else:
            b = r
        rgb_array = np.stack([r, g, b], axis=-1)
        Image.fromarray(rgb_array).save(file)

def create_tool_depth_map(input_depth_map: DepthMap, tool: 'Tool') -> DepthMap:
    # result = np.zeros_like(input_depth_map)
    # for x in tqdm(range(tool.radius, array.shape[1] - tool.radius)):
    #     for y in range(tool.radius, array.shape[0] - tool.radius):
    #         local_area = array[y - tool.radius:y + tool.radius + 1, x - tool.radius:x + tool.radius + 1]
    #         height = np.max(local_area - tool.height_map)
    #         tool_height[y, x] = height
    structure_element = -tool.depth_map
    structure_element[np.isneginf(structure_element)] = -1e30 # Zamiast +inf w oryginale
    result = ndimage.grey_dilation(
        input_depth_map, 
        footprint=np.isfinite(tool.depth_map), # Gdzie narzędzie w ogóle istnieje
        structure=structure_element
    )
    assert np.max(result) == np.max(input_depth_map)
    return result
