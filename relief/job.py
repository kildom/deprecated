

import numpy as np
from tool import Tool
from work import Work
from utils import DepthMap




class JobOptions:
    border_sharp: bool
    margin_mm: float
    tool: Tool
    max_level_depth_mm: float

    def __init__(self, *, tool: Tool, border_sharp: bool = True, margin_mm: float = 0.0, max_level_depth_mm: float = 1.0):
        self.id = id
        self.border_sharp = border_sharp
        self.margin_mm = margin_mm
        self.tool = tool
        self.max_level_depth_mm = max_level_depth_mm


class Job:

    id: int
    work: Work
    options: JobOptions

    def __init__(self, work: Work, options: JobOptions, id: int):
        self.id = id
        self.work = work
        self.options = options

    def execute(self, input_depth_map: DepthMap) -> DepthMap:
        pass

