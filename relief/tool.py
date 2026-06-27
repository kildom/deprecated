
import numpy as np

from utils import DepthMap, Mask
from work import Work

class Tool:
    name: str
    work: Work
    radius_mm: float
    radius: int
    work_radius_mm: float
    work_radius: int
    depth_map: DepthMap
    work_mask: Mask
    base_tool: 'Tool'
    base_tool_offset: float

    def __init__(self, work: Work, diameter_mm: float, overlay_mm: float, name: 'str|None' = None):
        self.work = work
        self.radius_mm = diameter_mm / 2
        self.radius = int(round(self.radius_mm * work.pixels_per_mm))
        self.work_radius_mm = self.radius_mm - 0.5 * overlay_mm
        self.work_radius = int(round(self.work_radius_mm * work.pixels_per_mm))
        self.name = name if name is not None else f"Tool_{id(self)}"
        self.base_tool = self
        self.base_tool_offset = 0
        assert self.radius > 2
        assert self.work_radius > 1 and self.work_radius < self.radius

    def create_tool_with_allowance(self, horizontal_allowance: float, vertical_allowance: float) -> 'Tool':
        pass
