


import math

import numpy as np
from utils import DepthMap
from tool import Tool
from work import Work


class ToolPath:
    work: Work
    tool: Tool
    depth_map: DepthMap
    points: list[tuple[int, int, int]]

    def __init__(self, work: Work, tool: Tool, *, depth_map: DepthMap | None = None):
        self.work = work
        self.tool = tool
        self.depth_map = depth_map
        self.points = []
    
    def add_points(self, points: list[tuple[int, int] | tuple[int, int, int]]):
        for point in points:
            if len(point) == 2:
                x, y = point
                z = None
            else:
                x, y, z = point
            self.add_point(x, y, z)

    def add_point(self, x: int, y: int, z: float | None = None):
        if z is None:
            z = self.depth_map[y, x]
        if len(self.points) > 0:
            prev_x, prev_y, prev_z = self.points[-1]
            if prev_x == x and prev_y == y and prev_z == z:
                return
        self.points.append((x, y, z))

    def dispose_helpers(self):
        self.depth_map = None

    def render(self, depth_map: DepthMap):
        r = self.tool.radius
        d = 2 * r + 1
        wc = depth_map.shape[1] - r
        hc = depth_map.shape[0] - r
        for x, y, z in self.points:
            if x >= r and x < wc and y >= r and y < hc:
                depth_map[y - r:y + r + 1, x - r:x + r + 1] = np.minimum(
                    depth_map[y - r:y + r + 1, x - r:x + r + 1],
                    z + self.tool.depth_map)
            else:
                y1 = y - r
                y2 = y + r + 1
                x1 = x - r
                x2 = x + r + 1
                tool_depth_map = self.tool.depth_map
                while y1 < 0:
                    tool_depth_map = tool_depth_map[1:]
                    y1 += 1
                while y2 >= depth_map.shape[0]:
                    tool_depth_map = tool_depth_map[:-1]
                    y2 -= 1
                while x1 < 0:
                    tool_depth_map = tool_depth_map[:, 1:]
                    x1 += 1
                while x2 >= depth_map.shape[1]:
                    tool_depth_map = tool_depth_map[:, :-1]
                    x2 -= 1
                depth_map[y1:y2, x1:x2] = np.minimum(
                    depth_map[y1:y2, x1:x2],
                    z + tool_depth_map)

def _test():
    from tool_flat import ToolFlat
    from tool_ball import ToolBall
    input = np.zeros((1000, 1000), dtype=np.float32)
    input[100, 100] = 1
    work = Work(input, width_mm=50, total_depth_mm=5)
    path = ToolPath(work, ToolFlat(work, diameter_mm=3, overlay_mm=0.7))
    path.add_point(500, 500, work.pixels_per_mm)
    assert len(path.points) == 1
    path.add_point(500, 500, work.pixels_per_mm)
    assert len(path.points) == 1

    a = np.ones((1000, 1000), dtype=np.float32) * work.total_depth
    path.render(a)
    assert a[500, 500] == work.pixels_per_mm
    assert a[502, 498] == work.pixels_per_mm
    assert a[600, 600] == work.total_depth

    a = np.zeros((1000, 1000), dtype=np.float32)
    path.render(a)
    assert a[500, 500] == 0
    assert a[502, 498] == 0
    assert a[600, 600] == 0

    path = ToolPath(work, ToolBall(work, diameter_mm=3, overlay_mm=0.7))
    path.add_point(500, 500, work.pixels_per_mm)
    a = np.ones((1000, 1000), dtype=np.float32) * work.total_depth
    path.render(a)
    assert a[500, 500] == work.pixels_per_mm
    assert a[504, 496] > work.pixels_per_mm
    assert a[504, 496] < work.pixels_per_mm + path.tool.radius


if __name__ == '__main__':
    _test()