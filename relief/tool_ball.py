

from tool_bull import ToolBull
from work import Work


class ToolBall(ToolBull):

    def __init__(self, work: Work, diameter_mm: float, overlay_mm: float, name: 'str|None' = None):
        super().__init__(work, diameter_mm, overlay_mm, diameter_mm / 2, diameter_mm / 2, name)
