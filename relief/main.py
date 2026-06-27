import threading

from PIL import Image
import numpy as np
import math
from tqdm import tqdm
from scipy import ndimage
from scipy.signal import convolve2d

from job import Job, JobOptions
from job_spiral import JobSpiral
from tool_flat import ToolFlat
from tool_ball import ToolBall
from work import Work
from debug_image import run_debug_gui

def main():
    # Read PNG file to numpy array
    image = Image.open('roza.png')
    array = np.array(image)

    work = Work(array, width_mm=100, total_depth_mm=5)

    tool = ToolFlat(work, diameter_mm=3, overlay_mm=0.7)
    job_options = JobOptions(tool=tool, border_sharp=True, margin_mm=0.3, max_level_depth_mm=0.7)
    job = JobSpiral(work, job_options, 1)
    depth_map = np.ones_like(work.depth_map) * work.total_depth
    depth_map = job.execute(depth_map)

    tool2 = ToolFlat(work, diameter_mm=1.5, overlay_mm=0.5)
    job2_options = JobOptions(tool=tool2, border_sharp=True, margin_mm=0.3, max_level_depth_mm=0.7)
    job2 = JobSpiral(work, job2_options, 2)
    depth_map = job2.execute(depth_map)

    tool3 = ToolBall(work, diameter_mm=1, overlay_mm=0.5)
    job3_options = JobOptions(tool=tool3, border_sharp=True, margin_mm=0, max_level_depth_mm=0.6)
    job3 = JobSpiral(work, job3_options, 3)
    depth_map = job3.execute(depth_map)

threading.Thread(target=main, daemon=True).start()
run_debug_gui()

