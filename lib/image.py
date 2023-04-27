

from pathlib import Path
import numpy as np
import png

def write_png(filename: 'Path|str', data: 'np.ndarray', black: float = 0, white: float = 1):
    shape = data.shape
    w = png.Writer(shape[1], shape[0], greyscale=True, bitdepth=8)
    with open(filename, 'wb') as fd:
        w.write(fd, [
            ((data[y] - black) / (white - black) * 255.0).astype(np.uint8)
            for y in range(0, shape[0])])
    return filename
