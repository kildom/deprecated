
from pathlib import Path
import png
import gzip
import yaml

img_path = Path(__file__).parent.parent / 'img'
raw_path = img_path / 'raw'
png_path = img_path / 'png'

with open(raw_path / 'dim.yml') as fd:
    dim = yaml.load(fd, yaml.BaseLoader)
    width = int(dim['width'])
    height = int(dim['height'])
    bits_per_pixel = int(dim['bits'])
    bytes_per_pixel = bits_per_pixel // 8

for file in list(raw_path.glob('*.raw')):
    print(f'Compressing {file}')
    with gzip.open(str(file) + '.gz', 'wb') as output, open(file, 'rb') as input:
        buf = input.read()
        output.write(buf)
    file.unlink()

for file in raw_path.glob('*.raw.gz'):
    png_base_name = (png_path / file.name).with_suffix('')
    png0 = png_base_name.with_suffix('.0.png')
    if png0.exists():
        continue

    print(f'Converting {png_base_name}')
    with gzip.open(file, 'rb') as input:
        buf = input.read()

    black = 0xFFFF
    white = 0x0000
    for i in range(0, len(buf), 2):
        v = (buf[i] << 8) | (buf[i + 1])
        black = min(black, v)
        white = max(white, v)
    cut = (white - black) // 10
    black += cut
    white -= cut

    print(f'    Color range: {black} - {white}')
    for i in range(len(buf) // (bytes_per_pixel * width * height)):
        print(f'    Slice: {i + 1} of {len(buf) // (bytes_per_pixel * width * height)}')
        rows = []
        for y in range(height):
            row = bytearray(width)
            rows.append(row)
            for x in range(width):
                offset = bytes_per_pixel * (width * height * i + width * y + x)
                v = (buf[offset] << 8) | (buf[offset + 1])
                row[x] = min(255, max(0, 255 * (v - black) // (white - black)))
        output_file = png_base_name.with_suffix(f'.{i}.png')
        print(f'        File {output_file}')
        w = png.Writer(width, height, greyscale=True, bitdepth=8, compression=9)
        with open(output_file, 'wb') as fd:
            w.write(fd, rows)
