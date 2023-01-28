

import math
from typing import Dict, List


#with open('/home/doki/work/ncs/nrf/samples/bluetooth/peripheral_cgms/build/zephyr/zephyr.map', 'r') as fd:
#with open('/home/doki/work/ncs/sizegraph/compress-text.py', 'r') as fd:
#with open('/home/doki/work/ncs/sizegraph/world192.txt', 'r') as fd:
#with open('/home/doki/work/ncs/sizegraph/web/build/static/js/main.44207111.js', 'r') as fd:
#with open('/home/doki/work/ncs/sizegraph/web/build/static/css/main.5051ce14.css', 'r') as fd:
with open('/home/doki/work/ncs/sizegraph/web-build/build/index.html', 'r') as fd:
    cnt = fd.read()

char_map = [0] * 128

for c in cnt:
    code = ord(c)
    if code >= 128:
        continue
    char_map[code] += 1

print(char_map)

esc_alt = '\t\b\f\x7F\x11\x12\x13\x14'

escapes = ''
for code in range(126, 31, -1):
    if (char_map[code] == 0) and (chr(code) not in '\\`$<'):
        escapes += chr(code)

if len(escapes) == 0:
    for c in esc_alt:
        code = ord(c)
        if (char_map[code] == 0):
            escapes = c
            break

if len(escapes) == 0:
    raise Exception('Cannot find any escape character.')

escapes += '!*-$'

print(f'escapes "{escapes}"')

HASH_BITS = 20
HASH_MAX = ((1 << HASH_BITS) - 1)
HASH_CONST = 31321
HASH_CONST_POW2 = (HASH_CONST * HASH_CONST) & HASH_MAX
HASH_CONST_POW3 = (HASH_CONST_POW2 * HASH_CONST) & HASH_MAX

print(''.join(chr(x) for x in range(32, 128)))

base91 = ' !"#%&\'()*+,-./0123456789:;=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~'


def hash_update(hash, input, output):
	return ((hash - HASH_CONST_POW3 * output) * HASH_CONST + input) & HASH_MAX

hash_table:'dict[int, list[int]]' = dict()

output = escapes + escapes[0]
hash = hash_update(0, ord(cnt[0]), 0)
hash = hash_update(hash, ord(cnt[1]), 0)
hash = hash_update(hash, ord(cnt[2]), 0)
hash = hash_update(hash, ord(cnt[3]), 0)
empty_hash_table_item = []

location = 0

# 5 escapes
chars_to_max_count = (
    3 + 0, # 0
    3 + 0, # 1
    3 + 1, # 2
    3 + 64, # 3
    3 + 128, # 4
    3 + 256, # 5
)

chars_to_max_offset = (
    0, # 0
    0, # 1
    32, # 2
    256, # 3
    14277, # 4
    65536, # 5
)

# 12 escapes
# chars_to_max_count = (
#     3 + 0, # 0
#     3 + 0, # 1
#     3 + 1, # 2
#     3 + 64, # 3
#     3 + 128, # 4
#     3 + 256, # 5
# )

# chars_to_max_offset = (
#     0, # 0
#     0, # 1
#     128, # 2
#     512, # 3
#     37629, # 4
#     65536, # 5
# )

chars_start_value = (
    0, # 0
    0, # 1
    0, # 2
    (chars_to_max_count[2] - 3) * chars_to_max_offset[2], # 3
    (chars_to_max_count[3] - 3) * chars_to_max_offset[3], # 4
    (chars_to_max_count[4] - 3) * chars_to_max_offset[4], # 5
)

MAX_COUNT = chars_to_max_count[-1]
MAX_OFFSET = chars_to_max_offset[-1]

def matching(prev, now):
    n = 0
    while (now + n < len(cnt)) and (n < MAX_COUNT):
        if cnt[prev + n] != cnt[now + n]:
            return n
        n += 1
    return n

while location + 4 < len(cnt):

    if hash in hash_table:
        past = hash_table[hash]
        while (len(past) > 0) and (location - past[0] > MAX_OFFSET):
            past.pop(0)
    else:
        past = empty_hash_table_item

    best_score = 1
    best_count = -1
    best_offset = -1
    chars_per_offset = 2
    for past_location in reversed(past):
        offset = location - past_location
        count = matching(past_location, location)
        while offset > chars_to_max_offset[chars_per_offset]:
            chars_per_offset += 1
        chars = chars_per_offset
        while count > chars_to_max_count[chars]:
            chars += 1
        score = count - chars
        if score > best_score:
            best_score = score
            best_count = count
            best_offset = offset

    if location % 100 == 1:
        pass#print(f'{location / 1024 / 1024} / {len(cnt) / 1024 / 1024}    {len(output) / location}')

    if best_count > 0:
        chars = 2
        while best_offset > chars_to_max_offset[chars]:
            chars += 1
        while best_count > chars_to_max_count[chars]:
            chars += 1
        value = best_offset - 1 + chars_to_max_offset[chars] * (best_count - 4)
        value1 = value
        code = ''
        if chars == 5:
            code = base91[value % 91]
            value = value // 91 + chars_start_value[5]
        if chars >= 4:
            code = base91[value % 91] + code
            value = value // 91 + chars_start_value[4]
        if chars >= 3:
            code = base91[value % 91] + code
            value = value // 91 + chars_start_value[3]
        code = escapes[value // 91] + base91[value % 91] + code
        output += code
        new_location = location +  best_count
        if new_location + 4 >= len(cnt):
            location = new_location
            break
    else:
        output += cnt[location]
        new_location = location + 1

    while location < new_location:
        if hash in hash_table:
            hash_table[hash].append(location)
        else:
            hash_table[hash] = [location]
        hash = hash_update(hash, ord(cnt[location + 4]), ord(cnt[location]))
        location += 1

while location < len(cnt):
    output += cnt[location]
    location += 1

print(f'{len(cnt)} -> {len(output)} = {len(output) / len(cnt) * 100}%')

with open('out.txt', 'w') as fd:
    fd.write(output)
