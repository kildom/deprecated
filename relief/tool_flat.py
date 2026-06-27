

import numpy as np
import math
from tool_bull import ToolBull
from tool import Tool
from work import Work

class ToolFlat(Tool):

    def __init__(self, work: Work, diameter_mm: float, overlay_mm: float, name: 'str|None' = None):
        super().__init__(work, diameter_mm, overlay_mm, name)

        # Generate height map of tool
        map_size = self.radius * 2 + 1
        self.depth_map = np.zeros(shape=(map_size, map_size), dtype=np.float32)
        map_radius = self.radius + 0.3
        for y in range(map_size):
            for x in range(map_size):
                dx = x - self.radius
                dy = y - self.radius
                distance = math.sqrt(dx * dx + dy * dy)
                if distance > map_radius:
                    self.depth_map[y, x] = math.inf # Outside the tool's area

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
