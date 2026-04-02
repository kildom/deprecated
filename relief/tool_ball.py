

from tool_bull import ToolBull
from work import Work


class ToolBall(ToolBull):

    def __init__(self, work: Work, diameter_mm: float, overlay_mm: float, depth_offset_mm: float = 0.0):
        super().__init__(work, diameter_mm, diameter_mm / 2, overlay_mm, depth_offset_mm)
