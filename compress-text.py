

import math
from typing import Dict, List


#with open('/home/doki/work/ncs/nrf/samples/bluetooth/peripheral_cgms/build/zephyr/zephyr.map', 'r') as fd:
with open('/home/doki/work/ncs/sizegraph/compress-text.py', 'r') as fd:
    cnt = fd.read()

char_map = [0] * 128

for c in cnt:
    code = ord(c)
    if code >= 128:
        continue
    char_map[code] += 1

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

reduced_len = 1
shift_len = len(escapes)
escape_bits = 0
while (shift_len > 1) and (escape_bits < 5):
    reduced_len <<= 1
    shift_len >>= 1
    escape_bits += 1

print(f'escapes "{escapes}"')

escapes = escapes[0:reduced_len]

print(f'escapes "{escapes}"')

HASH_BITS = 20
HASH_MAX = ((1 << HASH_BITS) - 1)
HASH_CONST = 31321
HASH_CONST_POW2 = (HASH_CONST * HASH_CONST) & HASH_MAX
HASH_CONST_POW3 = (HASH_CONST_POW2 * HASH_CONST) & HASH_MAX

base64_map_continue = '0123456789abcdefghijklmnopqrstuv'
base64_map_end = 'wxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'


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


chars_esc_to_count_bits = (
    (0, 0, 0, 0, 0, 0),
    (0, 1, 1, 1, 2, 3), # 1
    (2, 2, 3, 4, 4, 5), # 2
    (4, 4, 5, 6, 6, 6), # 3
    (6, 6, 7, 8, 9, 10), # 4
    (9, 10, 11, 12, 13, 14), # 5
)

chars_to_count_bits = (
    chars_esc_to_count_bits[0][escape_bits],
    chars_esc_to_count_bits[1][escape_bits],
    chars_esc_to_count_bits[2][escape_bits],
    chars_esc_to_count_bits[3][escape_bits],
    chars_esc_to_count_bits[4][escape_bits],
    chars_esc_to_count_bits[5][escape_bits],
)

chars_to_max_count = (
    (1 << chars_to_count_bits[0]) + 3,
    (1 << chars_to_count_bits[1]) + 3,
    (1 << chars_to_count_bits[2]) + 3,
    (1 << chars_to_count_bits[3]) + 3,
    (1 << chars_to_count_bits[4]) + 3,
    (1 << chars_to_count_bits[5]) + 3,
)
MAX_COUNT = chars_to_max_count[-1]

chars_to_max_offset = (
    (1 << (escape_bits + 0 * 5 - chars_to_count_bits[0])),
    (1 << (escape_bits + 1 * 5 - chars_to_count_bits[1])),
    (1 << (escape_bits + 2 * 5 - chars_to_count_bits[2])),
    (1 << (escape_bits + 3 * 5 - chars_to_count_bits[3])),
    (1 << (escape_bits + 4 * 5 - chars_to_count_bits[4])),
    (1 << (escape_bits + 5 * 5 - chars_to_count_bits[5])),
)
MAX_OFFSET = chars_to_max_offset[-1]

def matching(prev, now):
    n = 0
    while (now + n < len(cnt)) and (n < MAX_COUNT):
        if cnt[prev + n] != cnt[now + n]:
            return n
        n += 1
    return n

hist = list([0] * 9 for i in range(17))

while location + 4 < len(cnt):

    if cnt[location:location+20] == 'with open(\'/home/dok':
        location = location

    if hash in hash_table:
        past = hash_table[hash]
        while (len(past) > 0) and (location - past[0] > MAX_OFFSET):
            past.pop(0)
    else:
        past = empty_hash_table_item

    best_score = 1
    best_count = -1
    best_offset = -1
    chars = 1
    for past_location in reversed(past):
        offset = location - past_location
        while offset > chars_to_max_offset[chars]:
            chars += 1
        count = matching(past_location, location)
        score = count - 1 - chars
        if score > best_score:
            best_score = score
            best_count = count
            best_offset = offset

    if location % 100 == 1:
        pass#print(f'{location / 1024 / 1024} / {len(cnt) / 1024 / 1024}    {len(output) / location}')

    if best_count > 0:
        hist[int(math.ceil(math.log2(best_offset)))][min(8, int(math.ceil(math.log2(best_count - 3))))] += 1
        chars = 1
        while best_offset > chars_to_max_offset[chars]:
            chars += 1
        while best_count > chars_to_max_count[chars]:
            chars += 1
        value = (best_offset - 1) << chars_to_count_bits[chars]
        value |= best_count - 4
        code = escapes[(value >> (5 * chars)) & 0x1F]
        for i in range(chars - 1, 0, -1):
            code += base64_map_continue[(value >> (5 * i)) & 0x1F]
        code += base64_map_end[value & 0x1F]
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

with open('out.csv', 'w') as fd:
    for line in hist:
        fd.write(','.join(str(x) for x in line) + '\n')
