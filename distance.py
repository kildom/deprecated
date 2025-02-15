
import math

ref_colors = [
    (19, 32, 54, 'b'),
    (12, 28, 54, 'b'),
    (22, 59, 74, 'c'),
    (14, 59, 79, 'c'),
    (102, 71, 20, 'y'),
    (98, 70, 25, 'y'),
    (87, 15, 33, 'm'),
    (82, 20, 36, 'm'),
    (18, 30, 17, 'G'),
    (12, 31, 12, 'G'),
    (26, 56, 24, 'g'),
    (22, 53, 17, 'g'),
    (95, 43, 23, 'o'),
    (99, 43, 18, 'o'),
    (56, 44, 68, 'v'),
    (51, 42, 62, 'v'),
    (99, 98, 99, 'w'),
    (102, 102, 104, 'w'),
    (86, 13, 14, 'r'),
    (82, 21, 21, 'r'),
    (81, 81, 79, 's'),
    (76, 76, 74, 's'),
    (40, 38, 37, 'S'),
    (44, 40, 39, 'S')
]

def calc_diff(r, g, b, ref):
    r -= ref[0]
    g -= ref[1]
    b -= ref[2]
    return math.sqrt(r * r + g * g + b * b)

arr = []

for col1 in ref_colors:
    r, g, b, c1 = col1
    row = []
    for col2 in ref_colors:
        diff = calc_diff(r, g, b, col2)
        row.append(str(diff))
    print(c1 + '\t' + '\t'.join(row).replace('.', ','))
