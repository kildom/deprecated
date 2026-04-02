
import numpy as np

from utils import DepthMap, Mask
from work import Work

class Tool:
    work: Work
    radius_mm: float
    radius: int
    work_radius_mm: float
    work_radius: int
    depth_map: DepthMap
    work_mask: Mask
    depth_offset: float
    base_tool: 'Tool'

    def create_tool_with_margin(self, margin: int) -> 'Tool':
        pass
