import queue
import threading
from typing import Union, Tuple, Optional

import napari
import numpy as np
from qtpy.QtCore import QTimer


_queue = queue.Queue()


def debug_image(*args):
    """
    Usage:
        debug_image(arr)
        debug_image("name", arr)
        debug_image((y, x), arr)
        debug_image("name", (y, x), arr)
    """
    unnamed = 0
    i = 0

    while i < len(args):
        name: Optional[str] = None
        translate = (0.0, 0.0)

        # name
        if i < len(args) and isinstance(args[i], str):
            name = args[i]
            i += 1

        # translate
        if i < len(args) and isinstance(args[i], tuple) and len(args[i]) == 2:
            translate = tuple(float(v) for v in args[i])
            i += 1

        if i >= len(args):
            raise ValueError("Expected numpy array")

        arr = args[i]
        i += 1

        if not isinstance(arr, np.ndarray):
            raise TypeError(f"Expected numpy.ndarray, got {type(arr)}")

        if name is None:
            name = f"image_{unnamed}"
            unnamed += 1

        _queue.put((name, translate, arr))


def run_debug_gui():
    viewer = napari.Viewer()

    def add_image(name, translate, arr):
        # ---- FIX: handle RGB / RGBA properly ----
        if arr.ndim == 2:
            viewer.add_image(
                arr,
                name=name,
                translate=translate,
            )

        elif arr.ndim == 3 and arr.shape[-1] in (3, 4):
            # RGB or RGBA
            viewer.add_image(
                arr,
                name=name,
                translate=translate,
                rgb=True,
            )

        elif arr.ndim == 3 and arr.shape[-1] == 2:
            gray = arr[..., 0]
            alpha = arr[..., 1]

            # expand grayscale → RGB
            rgb = np.stack([gray, gray, gray], axis=-1)

            # combine with alpha → RGBA
            rgba = np.concatenate(
                [rgb, alpha[..., None]],
                axis=-1,
            )

            viewer.add_image(
                rgba,
                name=name,
                translate=translate,
                rgb=True,
            )

        else:
            raise ValueError(
                f"Unsupported shape {arr.shape}. "
                "Expected (H,W), (H,W,3), or (H,W,4)."
            )

    def poll_queue():
        while True:
            try:
                name, translate, arr = _queue.get_nowait()
            except queue.Empty:
                break

            add_image(name, translate, arr)

    timer = QTimer()
    timer.timeout.connect(poll_queue)
    timer.start(100)

    poll_queue()
    napari.run()


def self_test():
    import time
    import random
    import threading

    def worker():
        dtypes = [
            np.bool_,
            np.uint8,
            np.uint16,
            np.int16,
            np.float32,
            np.float64,
        ]

        for i in range(20):
            h = random.randint(200, 1000)
            w = random.randint(200, 1000)

            max_value = random.randint(1, 100000)
            dtype = random.choice(dtypes)

            if dtype is np.bool_:
                arr = np.random.rand(h, w) > 0.5

            elif np.issubdtype(dtype, np.integer):
                info = np.iinfo(dtype)

                high = min(max_value, info.max)
                if high < 1:
                    high = 1

                arr = np.random.randint(
                    0,
                    high + 1,
                    size=(h, w),
                    dtype=dtype,
                )

            else:
                arr = (
                    np.random.rand(h, w).astype(dtype)
                    * max_value
                )

            x = (10000 - w) / 2
            y = (10000 - h) / 2
            translate = (y, x)

            debug_image(
                f"img_{i}_{dtype.__name__}_{h}x{w}_0-{max_value}",
                translate,
                arr,
            )

            time.sleep(1)


    threading.Thread(target=worker, daemon=True).start()

    run_debug_gui()


if __name__ == "__main__":
    self_test()
