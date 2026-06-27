

import numpy as np
import math
from tool import Tool
from work import Work
from debug_image import debug_image

class ToolBull(Tool):

    corner_horizontal_radius_mm: float
    corner_horizontal_radius: float
    corner_vertical_radius_mm: float
    corner_vertical_radius: float

    def __init__(self, work: Work, diameter_mm: float, overlay_mm: float, corner_horizontal_radius_mm: float, corner_vertical_radius_mm: float, name: 'str|None' = None):
        super().__init__(work, diameter_mm, overlay_mm, name)
        self.corner_horizontal_radius_mm = corner_horizontal_radius_mm
        self.corner_horizontal_radius = corner_horizontal_radius_mm * work.pixels_per_mm
        self.corner_vertical_radius_mm = corner_vertical_radius_mm
        self.corner_vertical_radius = corner_vertical_radius_mm * work.pixels_per_mm

        assert self.corner_horizontal_radius > 0.0001
        assert self.corner_vertical_radius > 0.0001

        # Assume horizontal radius for now, scale height map later for vertical radius
        corner_radius = self.corner_horizontal_radius

        # Generate height map of tool
        map_size = self.radius * 2 + 1
        self.depth_map = np.zeros(shape=(map_size, map_size), dtype=np.float32)
        map_radius = self.radius + 0.3
        flat_radius = max(0, self.radius_mm * work.pixels_per_mm - corner_radius)
        for y in range(map_size):
            for x in range(map_size):
                dx = x - self.radius
                dy = y - self.radius
                distance = math.sqrt(dx * dx + dy * dy)
                if distance <= flat_radius:
                    self.depth_map[y, x] = 0
                elif distance > map_radius:
                    self.depth_map[y, x] = math.inf # Outside the tool's area
                else:
                    a = distance - flat_radius
                    if a < corner_radius:
                        b = math.sqrt(corner_radius * corner_radius - a * a)
                    else:
                        b = 0
                    self.depth_map[y, x] = max(0, corner_radius - b)
        
        # Scale height map for vertical radius making it an elliptical corners
        self.depth_map = self.depth_map * (self.corner_vertical_radius / self.corner_horizontal_radius)

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

        debug_image(
            f"{self.name}:{type(self).__name__} depth", (0, 0), np.dstack([self.depth_map, np.isfinite(self.depth_map).astype(np.float32)]),
            f"{self.name}:{type(self).__name__} work mask", ((self.depth_map.shape[0] - map_size) / 2, ) * 2, self.work_mask
            )


    def create_tool_with_allowance(self, horizontal_allowance: float, vertical_allowance: float) -> 'Tool':
        result = ToolBull(
            self.work,
            2 * self.radius_mm + 2 * horizontal_allowance,
            2 * (self.radius_mm - self.work_radius_mm + horizontal_allowance),
            horizontal_allowance,
            vertical_allowance)
        result.base_tool = self.base_tool
        result.base_tool_offset = vertical_allowance
        return result
