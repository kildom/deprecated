

import numpy as np
import math
from tool import Tool
from work import Work

class ToolBull(Tool):

    def __init__(self, work: Work, diameter_mm: float, corner_radius_mm: float, overlay_mm: float, depth_offset_mm: float = 0.0):
        self.work = work
        self.radius_mm = diameter_mm / 2
        self.radius = int(round(self.radius_mm * work.pixels_per_mm))
        self.work_radius_mm = self.radius_mm - 0.5 * overlay_mm
        self.work_radius = int(round(self.work_radius_mm * work.pixels_per_mm))
        self.depth_offset = depth_offset_mm * work.pixels_per_mm
        self.corner_radius = corner_radius_mm * work.pixels_per_mm
        self.base_tool = self
        assert self.radius > 2
        assert self.work_radius > 1 and self.work_radius < self.radius

        # Generate height map of tool
        map_size = self.radius * 2 + 1
        self.depth_map = np.zeros(shape=(map_size, map_size), dtype=np.float32)
        map_radius = self.radius + 0.3
        flat_radius = max(0, self.radius_mm * work.pixels_per_mm - self.corner_radius)
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
                    if a < self.corner_radius:
                        b = math.sqrt(self.corner_radius * self.corner_radius - a * a)
                    else:
                        b = 0
                    self.depth_map[y, x] = max(0, self.corner_radius - b)

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

    def create_tool_with_margin(self, margin_mm: float) -> 'Tool':
        result = ToolBull(
            self.work,
            2 * self.radius_mm + 2 * margin_mm,
            self.corner_radius * self.work.mm_per_pixel + margin_mm,
            2 * (self.radius_mm - self.work_radius_mm + margin_mm),
            margin_mm)
        result.base_tool = self.base_tool
        return result
