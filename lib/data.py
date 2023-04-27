
import gzip
import itertools
import json
import math
from pathlib import Path
import random
import sys
from types import SimpleNamespace
from typing import Any
from numpy.typing import NDArray
import numpy as np
import tensorflow as tf
import urllib.parse

from .image import write_png

VALIDATION_RATIO = (1, 6)
SECTION_STEP = 12

class ImageInfo(SimpleNamespace):
    file: Path
    slice_index: int
    image_type: str
    train_points: 'list[tuple[int, int]]'
    train_noise: 'list[tuple[int, int]]'
    validation_points: 'list[tuple[int, int]]'
    validation_noise: 'list[tuple[int, int]]'
    #train_lines: 'list[tuple[int, int, int, int]]'
    #validation_lines: 'list[tuple[int, int, int, int]]'
    width: int
    height: int

class SequenceGenerator:

    image_files: 'set[Path]'
    json: 'list[dict[str, Any]]'
    images: 'list[ImageInfo]'

    def __init__(self, json_file: 'Path|str', img_raw_dir: 'Path|str'):
        img_raw_dir = Path(img_raw_dir)
        self.image_files = set(img_raw_dir.glob('*.raw.gz'))
        self.image_files.update(img_raw_dir.glob('*.raw'))
        self.images = []
        with open(json_file, 'r') as fd:
            json_data: 'list[dict[str, Any]]' = json.load(fd)
        for task in json_data:
            image_data = self._create_image_data(task)
            if image_data is not None:
                self.images.append(image_data)

    def _create_image_data(self, task: 'dict[str, Any]') -> 'ImageInfo|None':
        image_info = ImageInfo()
        img = Path(urllib.parse.unquote(task['img']))
        img_stem = img.with_suffix('')
        image_info.slice_index = 0
        try:
            if str(int(img_stem.suffix[1:])) == img_stem.suffix[1:]:
                image_info.slice_index = int(img_stem.suffix[1:])
                img_stem = img_stem.with_suffix('')
        except ValueError:
            pass
        
        for raw_file in self.image_files:
            raw_file_stem = raw_file.stem
            if raw_file_stem.endswith('.raw'):
                raw_file_stem = raw_file_stem[:-4]
            if img_stem.name.endswith(raw_file_stem):
                image_info.file = raw_file
                break
        else:
            print(f'WARNING: Missing raw data for image {img.name}', file=sys.stderr)
            return None
        image_info.image_type = task['image-type'] if 'image-type' in task else ''
        points = self._get_image_points(task['point'] if 'point' in task else [])
        noise = self._get_image_points(task['noise'] if 'noise' in task else [])
        image_info.train_points = [p for p in points if self._is_train_data(p[0], p[1])]
        image_info.train_noise = [p for p in noise if self._is_train_data(p[0], p[1])]
        image_info.validation_points = [p for p in points if not self._is_train_data(p[0], p[1])]
        image_info.validation_noise = [p for p in noise if not self._is_train_data(p[0], p[1])]
        if ('point' in task) and len(task['point']):
            first_any = task['point'][0]
        elif ('noise' in task) and len(task['noise']):
            first_any = task['noise'][0]
        else:
            return None
        image_info.width = round(float(first_any['original_width']))
        image_info.height = round(float(first_any['original_height']))
        return image_info

    def _is_train_data(self, *args):
        p = 0
        for v in args:
            p += v
            p = (((p >> 16) ^ p) * 0x45d9f3b) & 0xFFFFFFF
            p = (((p >> 16) ^ p) * 0x9372d81) & 0xFFFFFFF
            p = (((p >> 16) ^ p) * 0x45d9f3b) & 0xFFFFFFF
            p = ((p >> 16) ^ p) & 0xFFFFFFF
        return p % VALIDATION_RATIO[1] >= VALIDATION_RATIO[0]

    def _get_image_points(self, arr: 'list[dict[str, Any]]') -> list[tuple[int, int]]:
        return [
            (round(float(p['x']) * float(p['original_width']) * 0.01), round(float(p['y']) * float(p['original_height']) * 0.01))
            for p in arr]

    def create_sequence(self, batch_size: int, is_validation: bool) -> 'LearningSequence':
        return LearningSequence(self, batch_size, is_validation)

    def create_conv_sequence(self, box_size: int, batch_size: int, is_validation: bool) -> 'ConvLearningSequence':
        return ConvLearningSequence(self, box_size, batch_size, is_validation)


class ImageSequenceData(SimpleNamespace):
    info: ImageInfo
    data: 'np.ndarray|None'
    unloaded_at_cache_size: int


class ConvLearningSequence(tf.keras.utils.Sequence):

    generator: 'SequenceGenerator'
    box_size: int
    batch_size: int
    is_validation: bool
    data: 'list[tuple[int, int, int, int]]'
    masks: 'list[np.ndarray]'
    images: 'list[ImageSequenceData]'
    cached_images: 'list[int]'
    cached_images_max: int

    def __init__(self, generator: 'SequenceGenerator', box_size: int, batch_size: int, is_validation: bool):
        self.generator = generator
        self.box_size = box_size
        center = box_size // 2
        self.batch_size = batch_size
        self.is_validation = is_validation
        self.images = []
        self.cached_images = []
        self.cached_images_max = 3
        prev_shuffle = []
        data_list = []
        for image_info in self.generator.images:
            image_index = len(self.images)
            image_data = ImageSequenceData()
            image_data.info = image_info
            image_data.data = None
            image_data.unloaded_at_cache_size = 0
            self.images.append(image_data)
            points = image_info.validation_points if is_validation else image_info.train_points
            noise = image_info.validation_noise if is_validation else image_info.train_noise
            all: 'list' = [(image_index, p[0], p[1], 1) for p in points]
            all.extend((image_index, p[0], p[1], 0) for p in noise)
            all.extend((image_index, p[0]-1, p[1], 0) for p in noise)
            all.extend((image_index, p[0], p[1]-1, 0) for p in noise)
            all.extend((image_index, p[0]-1, p[1]-1, 0) for p in noise)
            all.extend((image_index, p[0]+1, p[1], 0) for p in noise)
            all.extend((image_index, p[0], p[1]+1, 0) for p in noise)
            all.extend((image_index, p[0]+1, p[1]+1, 0) for p in noise)
            all.extend((image_index, p[0]+1, p[1]-1, 0) for p in noise)
            all.extend((image_index, p[0]-1, p[1]+1, 0) for p in noise)
            all.extend((image_index, p[0]-2, p[1], 0) for p in noise)
            all.extend((image_index, p[0], p[1]-2, 0) for p in noise)
            all.extend((image_index, p[0]-2, p[1]-2, 0) for p in noise)
            all.extend((image_index, p[0]+2, p[1], 0) for p in noise)
            all.extend((image_index, p[0], p[1]+2, 0) for p in noise)
            all.extend((image_index, p[0]+2, p[1]+2, 0) for p in noise)
            all.extend((image_index, p[0]+2, p[1]-2, 0) for p in noise)
            all.extend((image_index, p[0]-2, p[1]+2, 0) for p in noise)
            # TODO: allow border cases by slicing the masks
            all = [p for p in all
                   if (p[1] - center >= 0)
                   and (p[2] - center >= 0)
                   and (p[1] + center < image_info.width)
                   and (p[2] + center < image_info.height)]
            random.shuffle(all)
            mid = len(all) // 2
            part = all[:mid]
            part.extend(prev_shuffle)
            prev_shuffle = all[mid:]
            random.shuffle(part)
            data_list.append(part)
        data_list[-1].extend(prev_shuffle)
        self.data = list(itertools.chain.from_iterable(data_list))
        box_size = 49
        rad = np.zeros((box_size, box_size), dtype=np.float32)
        for y in range(box_size):
            for x in range(box_size):
                rad[y, x] = math.sqrt((x - center) * (x - center) + (y - center) * (y - center))
        prev_r = -1.0
        r_values = [1.2, 2.2, 2.9, 3.7, 4.5]
        self.masks = []
        for i in range(box_size):
            r = r_values[i] if i < len(r_values) else prev_r + (1 + prev_r / 12)
            self.masks.append(np.logical_and(rad > prev_r, rad <= r))
            prev_r = r
            if r > center:
                break
        self.masks.append(rad > prev_r)

    def on_epoch_end(self):
        for image_data in self.images:
            image_data.unloaded_at_cache_size = 0

    def _load_image(self, image_index: int, update_cache_size: bool = True):
        image_data = self.images[image_index]
        self.cached_images.append(image_index)
        if update_cache_size and (image_data.unloaded_at_cache_size > 0):
            self.cached_images_max = max(self.cached_images_max, image_data.unloaded_at_cache_size + 1)
        if len(self.cached_images) > self.cached_images_max:
            old_index = self.cached_images.pop(0)
            old_data = self.images[old_index]
            old_data.data.resize((0,))
            old_data.data = None
            old_data.unloaded_at_cache_size = self.cached_images_max
        bytes_per_slice = 2 * image_data.info.width * image_data.info.height
        skip_slices = image_data.info.slice_index
        with gzip.open(image_data.info.file, 'rb') as fd:
            while skip_slices > 0:
                fd.read(bytes_per_slice)
                skip_slices -= 1
            buf = fd.read(bytes_per_slice)
        arr = np.frombuffer(buf, np.uint16).byteswap(inplace=False).astype(np.float32)
        arr = arr.reshape(image_data.info.height, image_data.info.width)
        arr_min = float(arr.min())
        arr_max = float(arr.max())
        arr = (arr - arr_min) / (arr_max - arr_min) # TODO: use image range instead
        image_data.data = arr

    def _get_section(self, p: 'tuple[int, int, int, int]') -> 'np.ndarray':
        box_size = self.box_size
        center = box_size // 2
        image_index, x, y, _ = p
        if self.images[image_index].data is None:
            self._load_image(image_index)
        a = self.images[image_index].data[y-center:y+center+1,x-center:x+center+1]
        result = np.zeros((2, len(self.masks)), dtype=np.float32)
        for i in range(len(self.masks)):
            sec = a[self.masks[i]]
            result[0, i] = np.average(sec)
            result[1, i] = np.std(sec)
        return np.reshape(result, (2 * len(self.masks), ))


    def __len__(self):
        return (len(self.data) + self.batch_size - 1) // self.batch_size

    def __getitem__(self, idx):
        low = idx * self.batch_size
        high = min(low + self.batch_size, len(self.data))
        batch_data = self.data[low:high]
        return (
                np.array([self._get_section(p) for p in batch_data]),
                np.array([p[3] for p in batch_data])
               )
    
    def get_details(self, batch: int, index: int):
        box_size = self.box_size
        center = box_size // 2
        p = self.data[batch * self.batch_size + index]
        image_data = self.images[p[0]]
        if image_data.data is None:
            self._load_image(p[0])
        return (p, image_data.data[p[2]-center:p[2]+center+1,p[1]-center:p[1]+center+1], image_data)

'''
class LearningSequence(tf.keras.utils.Sequence):

    generator: 'SequenceGenerator'
    batch_items: int
    batch_size: int
    is_validation: bool
    data: 'list[tuple[int, int, int, int]]'
    images: 'list[ImageSequenceData]'
    cached_images: 'list[int]'
    cached_images_max: int

    def __init__(self, generator: 'SequenceGenerator', batch_size: int, is_validation: bool):
        self.generator = generator
        self.batch_items = max(1, batch_size // 8)
        self.batch_size = 8 * self.batch_items
        self.is_validation = is_validation
        self.images = []
        self.cached_images = []
        self.cached_images_max = 3
        prev_shuffle = []
        data_list = []
        for image_info in self.generator.images:
            image_index = len(self.images)
            image_data = ImageSequenceData()
            image_data.info = image_info
            image_data.data = None
            image_data.unloaded_at_cache_size = 0
            self.images.append(image_data)
            points = image_info.validation_points if is_validation else image_info.train_points
            noise = image_info.validation_noise if is_validation else image_info.train_noise
            all: 'list' = [(image_index, p[0], p[1], 1) for p in points]
            all.extend((image_index, p[0], p[1], 0) for p in noise)
            # TODO: move points
            all = [p for p in all
                   if (p[1] - 2 * SECTION_STEP >= 0)
                   and (p[2] - 2 * SECTION_STEP >= 0)
                   and (p[1] + 2 * SECTION_STEP <= image_info.width)
                   and (p[2] + 2 * SECTION_STEP <= image_info.height)]
            random.shuffle(all)
            mid = len(all) // 2
            part = all[:mid]
            part.extend(prev_shuffle)
            prev_shuffle = all[mid:]
            random.shuffle(part)
            data_list.append(part)
        data_list[-1].extend(prev_shuffle)
        self.data = list(itertools.chain.from_iterable(data_list))

    def on_epoch_end(self):
        for image_data in self.images:
            image_data.unloaded_at_cache_size = 0

    def _load_image(self, image_index: int):
        image_data = self.images[image_index]
        self.cached_images.append(image_index)
        if image_data.unloaded_at_cache_size > 0:
            self.cached_images_max = max(self.cached_images_max, image_data.unloaded_at_cache_size + 1)
        if len(self.cached_images) > self.cached_images_max:
            old_index = self.cached_images.pop(0)
            old_data = self.images[old_index]
            old_data.data.resize((0,))
            old_data.data = None
            old_data.unloaded_at_cache_size = self.cached_images_max
        bytes_per_slice = 2 * image_data.info.width * image_data.info.height
        skip_slices = image_data.info.slice_index
        with gzip.open(image_data.info.file, 'rb') as fd:
            while skip_slices > 0:
                fd.read(bytes_per_slice)
                skip_slices -= 1
            buf = fd.read(bytes_per_slice)
        arr = np.frombuffer(buf, np.uint16).byteswap(inplace=False).astype(np.float32)
        arr = arr.reshape(image_data.info.height, image_data.info.width)
        arr_min = float(arr.min())
        arr_max = float(arr.max())
        arr = (arr - arr_min) / (arr_max - arr_min) # TODO: use image range instead
        image_data.data = arr

    def _get_sections(self, p: 'tuple[int, int, int, int]') -> 'np.ndarray':
        image_index, x, y, _ = p
        if self.images[image_index].data is None:
            self._load_image(image_index)
        a = np.array(self.images[image_index].data[y-2*SECTION_STEP:y+2*SECTION_STEP, x-2*SECTION_STEP:x+2*SECTION_STEP])
        t = np.transpose(a)
        return (a, np.fliplr(a) ,np.flipud(a), np.flip(a, (0, 1)),
                t, np.fliplr(t) ,np.flipud(t), np.flip(t, (0, 1)))

    def __len__(self):
        return (len(self.data) + self.batch_items - 1) // self.batch_items

    def __getitem__(self, idx):
        low = idx * self.batch_items
        high = min(low + self.batch_items, len(self.data))
        batch_data = self.data[low:high]
        return (
                np.array(list(itertools.chain.from_iterable(self._get_sections(p) for p in batch_data))),
                np.array(list(itertools.chain.from_iterable([p[3]] * 8 for p in batch_data)))
               )
'''

if __name__ == "__main__":
    def test():
        root = Path(__file__).parent.parent
        gen = SequenceGenerator(root / 'img/project-1-at-2023-04-26-09-30-67e828b7.json', root / 'img/raw')
        seq = gen.create_conv_sequence(49, 16, True)
        print(len(seq))
        print(seq[0][0].shape)
        print(seq[0][1].shape)
        print(seq[0][0][0])
        print(seq[0][1][0])
    test()