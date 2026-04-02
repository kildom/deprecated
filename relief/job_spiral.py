
import math
import numpy as np
from tkinter import Image
from job import Job, JobOptions
from tool_path import ToolPath
from tool import Tool
from work import Work
from utils import DepthMap, create_tool_depth_map, debug, DEBUG, debug_image
from tqdm import tqdm


class JobSpiral(Job):

    tool_with_margin: Tool
    rectangles: list[tuple[int, int, int, int]]
    corner_walk_off: int
    max_level_depth: float
    level_depth: float
    tool_depth_map: DepthMap
    levels: int
    paths: list[ToolPath]


    def __init__(self, work: Work, options: JobOptions, id: int):
        super().__init__(work, options, id)
        assert self.options.tool.depth_offset == 0
        if options.margin_mm > 0:
            self.tool_with_margin = self.options.tool.create_tool_with_margin(options.margin_mm)
        else:
            self.tool_with_margin = self.options.tool
        self.max_level_depth = options.max_level_depth_mm * work.pixels_per_mm
        self.paths = []
        self._prepare_rectangles()
    
    def _prepare_rectangles(self):
        self.rectangles = []
        tool = self.tool_with_margin
        if self.options.border_sharp:
            keep_out = tool.radius
        else:
            keep_out = int(math.floor(tool.work_radius / math.sqrt(2)))
        x1 = keep_out
        y1 = keep_out
        x2 = self.work.width - keep_out - 1
        y2 = self.work.height - keep_out - 1
        if x2 <= x1 or y2 <= y1:
            raise ValueError('Tool is too big for the work area with the given margin')
        while True:
            self.rectangles.append((x1, y1, x2, y2))
            # If last rectangle was small enough to cutout everything, we are done
            if x2 - x1 <= 2 * tool.work_radius or y2 - y1 <= 2 * tool.work_radius:
                break
            # If after reduction, the rectangle will be still big enough, reduce it as much as possible.
            if x2 - x1 >= 6 * tool.work_radius:
                step = tool.work_radius
            else:
                step = max(1, (x2 - x1) // 6)
            x1 += 2 * step
            x2 -= 2 * step
            if y2 - y1 >= 6 * tool.work_radius:
                step = tool.work_radius
            else:
                step = max(1, (y2 - y1) // 6)
            y1 += 2 * step
            y2 -= 2 * step
        self.corner_walk_off = int(math.ceil(math.sqrt(2) * tool.work_radius - tool.work_radius))
        #debug('Rectangles:', self.rectangles)
        debug('Corner walk off:', self.corner_walk_off)


    def execute(self, input_depth_map: DepthMap) -> DepthMap:
        debug(f'Executing JobSpiral {self.id}...')

        # Create depth map showing how deep tool (with margin) could go down.
        self.tool_depth_map = create_tool_depth_map(self.work.depth_map, self.tool_with_margin)

        # Create depth map showing when tool (with margin) starts to touch the workpiece.
        # It will be updated later when each level is finished.
        self.top_depth_map = create_tool_depth_map(input_depth_map, self.options.tool)
        self.top_depth_map -= self.tool_with_margin.depth_offset + 0.05

        # Save debug images
        if DEBUG:
            rect = np.zeros_like(self.tool_depth_map)
            for x, y in self._rect_pixels_generator():
                rect[y, x] = 65535
            self.work.debug_image(f'{self.id}-JobSpiral-0-input.png', np.maximum(input_depth_map, rect))
            self.work.debug_image(f'{self.id}-JobSpiral-1-tool_depth_map.png', np.maximum(self.tool_depth_map, rect))
        
        # Start cutting when tool (with margin) starts to touch the workpiece.
        start_depth = np.max(self.top_depth_map)

        # End cutting when the tool (with margin) can go no more down.
        end_depth = np.min(self.work.depth_map)
        assert start_depth > end_depth

        # Calculate levels and level depths and show results.
        self.levels = math.ceil((start_depth - end_depth) / self.max_level_depth)
        self.level_depth = (start_depth - end_depth) / self.levels
        self.depth_tolerance = self.max_level_depth / 20
        debug('    start depth:', start_depth * self.work.mm_per_pixel)
        debug('    end depth:', end_depth * self.work.mm_per_pixel)
        debug('    levels:', self.levels)
        debug('    level depth:', self.level_depth * self.work.mm_per_pixel)
        debug('    depth tolerance:', self.depth_tolerance * self.work.mm_per_pixel)

        # Depth map that will track actual workpiece shape after each level.
        if DEBUG:
            self.tmp_map = input_depth_map.copy()
        
        # Execute job for each level.
        for level in tqdm(range(self.levels), desc=f'SpiralJob {self.id} level'):
            if level == self.levels - 1:
                target_depth = end_depth
            else:
                target_depth = start_depth - (level + 1) * self.level_depth
            self._execute_level(level, target_depth)

        # Render all paths to the final depth map.
        result_depth_map = input_depth_map.copy()
        for path in tqdm(self.paths, desc=f'SpiralJob {self.id} rendering paths'):
            path.render(result_depth_map)
        self.work.debug_image(f'{self.id}-JobSpiral-5-output.png', result_depth_map)

        # And return the result.
        return result_depth_map #TODO: This should return paths, the output will be rendered outside of the job.
    

    def _execute_level(self, level: int, target_depth: float):
        level_depth = np.maximum(target_depth, self.tool_depth_map)
        level_paths: list[ToolPath] = []
        path: 'ToolPath | None' = None
        tmp_pixels = []
        path_break_threshold = 5 * self.work.pixels_per_mm # TODO: This should depend on some speed parameters
        if DEBUG: path_types = np.zeros_like(self.work.depth_map)
        for x, y in self._rect_pixels_generator():
            required_depth = level_depth[y, x]
            current_depth = self.top_depth_map[y, x]
            if required_depth < current_depth - self.depth_tolerance:
                if DEBUG: path_types[y, x] = 65535 // 2
                self.top_depth_map[y, x] = required_depth
                if path is None:
                    path = ToolPath(self.work, self.options.tool)
                path.add_points(tmp_pixels)
                tmp_pixels.clear()
                path.add_point(x, y, required_depth + self.tool_with_margin.depth_offset)
            elif path is not None:
                if DEBUG: path_types[y, x] = 65535 // 3 * 2
                tmp_pixels.append((x, y, required_depth + self.tool_with_margin.depth_offset))
                if len(tmp_pixels) >= path_break_threshold:
                    level_paths.append(path)
                    path.dispose_helpers()
                    path = None
                    tmp_pixels.clear()
            else:
                if DEBUG: path_types[y, x] = 65535 // 3
        if path is not None and len(path.points) > 0:
            level_paths.append(path)
            path.dispose_helpers()
        self.paths.extend(level_paths)
        if DEBUG:
            self.work.debug_image(f'{self.id}-JobSpiral-2-{level}-0-path_types.png', path_types)
            path_types = np.zeros_like(self.work.depth_map)
            for path in level_paths:
                for x, y, z in path.points:
                    path_types[y, x] = 65535
                path.render(self.tmp_map)
            self.work.debug_image(f'{self.id}-JobSpiral-2-{level}-1-path_types2.png', path_types)
            self.work.debug_image(f'{self.id}-JobSpiral-2-{level}-2-level_output.png', self.tmp_map)

    def _rect_pixels_generator(self):
        x = self.rectangles[0][0]
        y = self.rectangles[0][1]
        walk_off = 0
        for (x1, y1, x2, y2) in self.rectangles:
            # Go to the first corner of the rectangle
            while x < x1 and y < y1:
                yield x, y
                x += 1
                y += 1
            while x < x1:
                yield x, y
                x += 1
            while y < y1:
                yield x, y
                y += 1
            # Go along top edge
            while x < x2:
                yield x, y
                x += 1
            # Walk off the corner
            for i in list(range(walk_off)) + list(range(walk_off, -1, -1)):
                yield x + i, y - i
            # Go along right edge
            while y < y2:
                yield x, y
                y += 1
            # Walk off the corner
            for i in list(range(walk_off)) + list(range(walk_off, -1, -1)):
                yield x + i, y + i
            # Go along bottom edge
            while x > x1:
                yield x, y
                x -= 1
            # Walk off the corner
            for i in list(range(walk_off)) + list(range(walk_off, -1, -1)):
                yield x - i, y + i
            # Go along left edge
            while y > y1:
                yield x, y
                y -= 1
            yield x, y
            walk_off = self.corner_walk_off
            
