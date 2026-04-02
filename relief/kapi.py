from PIL import Image
import numpy as np
import math
from tqdm import tqdm
from scipy import ndimage
from scipy.signal import convolve2d

POINTS_PER_MM = 40.0
MM_PER_POINT = 1 / POINTS_PER_MM
TOTAL_HEIGHT_MM = 5
HEIGHT_STEP_MM = 1


total_height = TOTAL_HEIGHT_MM * POINTS_PER_MM
steps = math.ceil(TOTAL_HEIGHT_MM / HEIGHT_STEP_MM)
step_height = total_height / steps

class Tool:
    height_map: np.ndarray
    radius: int
    work_radius: int
    work_mask: np.ndarray

class RoundTool(Tool):
    def __init__(self, radius_mm, work_radius_mm):
        self.radius = int(round(radius_mm * POINTS_PER_MM))
        self.work_radius = int(round(work_radius_mm * POINTS_PER_MM))
        # Generate height map of tool
        map_size = self.radius * 2 + 1
        self.height_map = np.zeros(shape=(map_size, map_size), dtype=np.float32)
        map_radius = self.radius + 0.3
        for y in range(map_size):
            for x in range(map_size):
                dx = x - self.radius
                dy = y - self.radius
                distance = math.sqrt(dx * dx + dy * dy)
                if distance <= map_radius:
                    self.height_map[y, x] = map_radius - math.sqrt(map_radius * map_radius - distance * distance)
                else:
                    self.height_map[y, x] = math.inf # Outside the tool's area
        # Generate work mask
        map_size = self.work_radius * 2 + 1
        self.work_mask = np.zeros(shape=(map_size, map_size), dtype=np.bool)
        map_radius = self.work_radius + 0.3
        for y in range(map_size):
            for x in range(map_size):
                dx = x - self.work_radius
                dy = y - self.work_radius
                distance = math.sqrt(dx * dx + dy * dy)
                self.work_mask[y, x] = (map_radius >= distance)
    

# Read PNG file to numpy array
image = Image.open('roza.png')
array = np.array(image)
if len(array.shape) == 3:  # Color image
    array = np.sum(array, axis=2)  # Convert to grayscale by summing RGB channels
array = array.astype(np.float32)
array = array - np.min(array)  # Shift values to start from 0
array = array / np.max(array)  # Normalize to range [0, 1]
array = array * TOTAL_HEIGHT_MM * POINTS_PER_MM  # Scale to total height in points

tool = RoundTool(radius_mm=0.5, work_radius_mm=0.4)

# If tool_height.npy exists, load it, otherwise initialize tool_height
try:
    tool_height = np.load('tool_height.npy')
    print("Loaded tool_height from cache.")
except FileNotFoundError:
    tool_height = None

if tool_height is None:
    tool_height = np.zeros_like(array)

    # for x in tqdm(range(tool.radius, array.shape[1] - tool.radius)):
    #     for y in range(tool.radius, array.shape[0] - tool.radius):
    #         local_area = array[y - tool.radius:y + tool.radius + 1, x - tool.radius:x + tool.radius + 1]
    #         height = np.max(local_area - tool.height_map)
    #         tool_height[y, x] = height

    # Wykonanie operacji
    print("Performing grey dilation...")
    structure_element = -tool.height_map
    structure_element[np.isneginf(structure_element)] = -1e30 # Zamiast +inf w oryginale
    tool_height = ndimage.grey_dilation(
        array, 
        footprint=np.isfinite(tool.height_map), # Gdzie narzędzie w ogóle istnieje
        structure=structure_element
    )
    print("Grey dilation completed.")
    # Save tool_height to file for cache
    np.save('tool_height.npy', tool_height)

debug_image = np.stack([array / np.max(array), np.zeros_like(array), tool_height / np.max(tool_height)], axis=2)

VERTICAL = 0
HORIZONTAL = 1


def follow_path(mask, edge_done, x, y, orientation):
    #print('----')
    path: list[tuple[int, int]] = []
    border_reached = False
    while not edge_done[y, x, orientation]:
        #print(x, y, orientation)#; exit()
        # if x >= mask.shape[1]-1 or y >= mask.shape[0]-1:
        #     break
        edge_done[y, x, orientation] = True
        if orientation == VERTICAL:
            if mask[y, x]:
                path.append((x + 1, y))
                if border_reached:
                    break
                elif mask[y + 1, x + 1]:
                    x += 1
                    orientation = HORIZONTAL
                elif mask[y + 1, x]:
                    y += 1
                else:
                    orientation = HORIZONTAL
            else:
                path.append((x, y))
                if border_reached:
                    break
                elif mask[y - 1, x]:
                    y -= 1
                    orientation = HORIZONTAL
                elif mask[y - 1, x + 1]:
                    y -= 1
                else:
                    y -= 1
                    x += 1
                    orientation = HORIZONTAL
        else:
            if mask[y, x]:
                path.append((x, y + 1))
                if border_reached:
                    break
                elif mask[y + 1, x - 1]:
                    x -= 1
                    y += 1
                    orientation = VERTICAL
                elif mask[y, x - 1]:
                    x -= 1
                else:
                    x -= 1
                    orientation = VERTICAL
            else:
                path.append((x, y))
                if border_reached:
                    break
                elif mask[y, x + 1]:
                    orientation = VERTICAL
                elif mask[y + 1, x + 1]:
                    x += 1
                else:
                    y += 1
                    orientation = VERTICAL
        border_reached = (x == mask.shape[1] - 1
            or y == mask.shape[0] - 1
            or (x == 0 and orientation == HORIZONTAL)
            or (y == 0 and orientation == VERTICAL))
    #exit()
    return path


for level in range(0, steps):
    base_height = level * step_height
    next_height = (level + 1) * step_height
    mask = tool_height >= next_height
    matches_all = np.zeros_like(mask, dtype=np.bool)
    edge_done = np.zeros(shape=(mask.shape[0], mask.shape[1], 2), dtype=np.bool)
    #edge_done[y,x,orientation], orientation: 0 - vertical (|), 1 - horizontal (-)
    edge_done[:,-1,VERTICAL] = True
    edge_done[-1,:,HORIZONTAL] = True
    paths: list[list[tuple[int, int]]] = []
    # Follow paths that starts at the left/right border of an image
    for y in range(mask.shape[0] - 1):
        if not mask[y, 0] and mask[y + 1, 0]:
            paths.append(follow_path(mask, edge_done, 0, y, HORIZONTAL))
        if mask[y, -1] and not mask[y + 1, -1]:
            paths.append(follow_path(mask, edge_done, mask.shape[1] - 1, y, HORIZONTAL))
    # Follow paths that starts at the top/bottom border of an image
    for x in range(mask.shape[1] - 1):
        if mask[0, x] and not mask[0, x + 1]:
            paths.append(follow_path(mask, edge_done, x, 0, VERTICAL))
        if not mask[-1, x] and mask[-1, x + 1]:
            paths.append(follow_path(mask, edge_done, x, mask.shape[0] - 1, VERTICAL))
    # Mark all edges at the border of an image as done
    edge_done[0, :, VERTICAL] = True
    edge_done[-1, :, VERTICAL] = True
    edge_done[:, 0, HORIZONTAL] = True
    edge_done[:, -1, HORIZONTAL] = True
    # Follow paths that are fully inside an image
    for y in tqdm(range(mask.shape[0])):
        for x in range(mask.shape[1]):
            if x + 1 < mask.shape[1] and mask[y,x] != mask[y,x+1] and not edge_done[y,x,VERTICAL]:
                paths.append(follow_path(mask, edge_done, x, y, VERTICAL))
            if y + 1 < mask.shape[0] and mask[y,x] != mask[y+1,x] and not edge_done[y,x,HORIZONTAL]:
                paths.append(follow_path(mask, edge_done, x, y, HORIZONTAL))
    print(f"Level {level}/{steps}: {len(paths)} paths")
    for i, path in enumerate(paths):
        c = 3
        for x, y in path:
            debug_image[y,x,1] = c
            c += 1
            if c > 10:
                c = 3
    # while True:
    #     mapped_mask = np.where(mask, 1, -1)
    #     res1 = convolve2d(mapped_mask, np.array([[ 1, -1], [-1,  1]]), mode='same')
    #     res2 = convolve2d(mapped_mask, np.array([[-1,  1], [ 1, -1]]), mode='same')
    #     matches = (res1 == 4) | (res2 == 4)
    #     if matches.sum() == 0:
    #         break
    #     matches[:-1,:] |= matches[1:,:]
    #     matches[:,:-1] |= matches[:,1:]
    #     mask |= matches
    #     matches_all |= matches
    #     break
    struct = ndimage.generate_binary_structure(2, 1) # Łączność 4-kierunkowa (krzyż)
    dilated_mask = ndimage.binary_dilation(mask, structure=struct)
    boundary = dilated_mask ^ mask
    done_mask = ndimage.binary_dilation(boundary, structure=tool.work_mask)
    #debug_image[:,:,1] = matches_all
    debug_image[:,:,2] = mask
    #break

debug_image[:,:,0] = debug_image[:,:,0] / (np.max(debug_image[:,:,0]) + 1e-10) 
debug_image[:,:,1] = debug_image[:,:,1] / (np.max(debug_image[:,:,1]) + 1e-10)
debug_image[:,:,2] = debug_image[:,:,2] / (np.max(debug_image[:,:,2]) + 1e-10)

Image.fromarray((tool.work_mask * 255).astype(np.uint8)).save('height_map.png')
Image.fromarray((tool_height / np.max(tool_height) * 255).astype(np.uint8)).save('tool_height.png')
Image.fromarray((debug_image / np.max(debug_image) * 255).astype(np.uint8)).save('debug_image.png')

print(array.shape)  # (height, width)
