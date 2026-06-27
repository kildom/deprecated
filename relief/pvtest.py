from PIL import Image
import numpy as np
import math
from tqdm import tqdm
from scipy import ndimage
from scipy.signal import convolve2d
import numpy as np
import pyvista as pv


from job import Job, JobOptions
from job_spiral import JobSpiral
from utils import create_tool_depth_map
from tool_flat import ToolFlat
from tool_ball import ToolBall
from work import Work

# Read PNG file to numpy array
image = Image.open('roza.png')
array = np.array(image)

width_mm = 100
total_depth_mm = 7
points_per_mm = 20
faces_per_square_mm = 10
max_faces_for_decimation = 4000000

work = Work(array, width_mm=width_mm, total_depth_mm=total_depth_mm)
tool3 = ToolBall(work, diameter_mm=0.9, overlay_mm=0.6)

area_square_mm = work.width_mm * work.height_mm

print('Creating tool depth map...')
filtered = create_tool_depth_map(work.depth_map, tool3) # TODO: Ten wynik nie przedstawia prawdziwego efektu tylko położenie czubka narzędzie, które jest inne niż powierzchnia wykonana tym narzędziem.

# Resize filtered image to specified number of pixels per mm
new_width = int(work.width_mm * points_per_mm)
print('max1', np.max(filtered))
if new_width < filtered.shape[1]:
    new_height = int(work.height_mm * points_per_mm)
    print(f"Resizing filtered image from {filtered.shape} to ({new_height}, {new_width})...")
    top = np.max(filtered)
    filtered_image = Image.fromarray((filtered / top * 65535).astype(np.uint16))
    filtered_image = filtered_image.resize((new_width, new_height), resample=Image.BILINEAR)
    filtered = np.array(filtered_image).astype(np.float32) / 65535.0 * top
else:
    print(f"No resizing needed for filtered image of size {filtered.shape}.")

Image.fromarray((filtered / np.max(filtered) * 65535).astype(np.uint16)).save('filtered.png')

def my_decimate(a: pv.PolyData, expected_faces: float) -> pv.PolyData:
    a = a.clean()
    a = a.triangulate()
    if a.n_cells <= expected_faces:
        return a
    elif a.n_cells > max_faces_for_decimation:
        reduction_fraction = 1 - max_faces_for_decimation / a.n_cells
        print(f"Pre-decimating from {a.n_cells} to {max_faces_for_decimation} faces (reduction fraction: {reduction_fraction:.4f})...")
        a = a.decimate_pro(reduction_fraction, progress_bar=True)

    if a.n_cells > expected_faces:
        reduction_fraction = 1 - expected_faces / a.n_cells
        print(f"Decimating from {a.n_cells} to {expected_faces} faces (reduction fraction: {reduction_fraction:.4f})...")
        return a.decimate(reduction_fraction, progress_bar=True)

    return a

x_grid, y_grid = np.meshgrid(
    np.arange(filtered.shape[1]).astype(np.float32) / (filtered.shape[1] - 1) * work.width_mm,
    np.arange(filtered.shape[0]).astype(np.float32) / (filtered.shape[0] - 1) * work.height_mm
    )
z_values = filtered.astype(np.float32) * work.mm_per_pixel

grid = pv.StructuredGrid(x_grid, y_grid, z_values, force_float=False)
#print(x_grid, y_grid, z_values)
#print(x_grid.shape, y_grid.shape, z_values.shape)
print('Extracting surface...')
surface = grid.extract_surface(algorithm='dataset_surface')
surface = my_decimate(surface, expected_faces=10 * area_square_mm * faces_per_square_mm)

surface.save("pv_surface.stl")

thickness = work.total_depth_mm
print('Extruding surface...')
solid = surface.extrude([0, 0, -1000 * thickness], capping=True)

# Identify points near the bottom and force them to the flat Z level
mask = solid.points[:, 2] < -500 * thickness
solid.points[mask, 2] = -thickness

print('Triangulating surface...')
optimized_solid = solid.triangulate()
optimized_solid = optimized_solid.clean()

optimized_solid.save("pv_big.stl")

print('Decimating surface...')
optimized_solid = my_decimate(optimized_solid, expected_faces=area_square_mm * faces_per_square_mm)
optimized_solid.save("pv_final.stl")

print('Number of surfaces in final STL:', optimized_solid.n_cells)
