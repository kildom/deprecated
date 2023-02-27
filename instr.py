

#
# Generated from "data/instr.csv" using the "data/gen_instr_table.py" script.
# Do not edit manually.
#

from enum import IntEnum
from wasm_types import InstrInfo as II, ParseMethod

INSTRUCTIONS = {
    0x00: II(opcode=0x00, name='unreachable', stack=0, builtins=('unreachable',)),
    0x01: II(opcode=0x01, name='nop', stack=0, code='# nop'),
    0x02: II(opcode=0x02, name='block', parse=ParseMethod.BLOCK),
    0x03: II(opcode=0x03, name='loop', parse=ParseMethod.BLOCK),
    0x04: II(opcode=0x04, name='if', parse=ParseMethod.BLOCK),
    0x05: II(opcode=0x05, name='else', parse=ParseMethod.CUSTOM),
    # 0x06: reserved,
    # ... : reserved,
    # 0x0A: reserved,
    0x0B: II(opcode=0x0B, name='end', parse=ParseMethod.CUSTOM),
    0x0C: II(opcode=0x0C, name='br', parse=ParseMethod.CUSTOM),
    0x0D: II(opcode=0x0D, name='br_if', parse=ParseMethod.CUSTOM),
    0x0E: II(opcode=0x0E, name='br_table', parse=ParseMethod.CUSTOM),
    0x0F: II(opcode=0x0F, name='return'),
    0x10: II(opcode=0x10, name='call', parse=ParseMethod.U64),
    0x11: II(opcode=0x11, name='call_indirect', parse=ParseMethod.U64U64),
    # 0x12: reserved,
    # ... : reserved,
    # 0x19: reserved,
    0x1A: II(opcode=0x1A, name='drop', stack=-1, code='# drop {-1}'),
    0x1B: II(opcode=0x1B, name='select', stack=-2, code='if not {-1}:\n\t{-3} = {-2}'),
    0x1C: II(opcode=0x1C, name='select_t', parse=ParseMethod.CUSTOM, stack=-2, code='if not {-1}:\n\t{-3} = {-2}'),
    # 0x1D: reserved,
    # 0x1E: reserved,
    # 0x1F: reserved,
    0x20: II(opcode=0x20, name='local.get', parse=ParseMethod.U64, stack=+1, code='{0} = l{imm}'),
    0x21: II(opcode=0x21, name='local.set', parse=ParseMethod.U64, stack=-1),
    0x22: II(opcode=0x22, name='local.tee', parse=ParseMethod.U64, stack=0),
    0x23: II(opcode=0x23, name='global.get', parse=ParseMethod.U64, stack=+1),
    0x24: II(opcode=0x24, name='global.set', parse=ParseMethod.U64, stack=-1),
    0x25: II(opcode=0x25, name='table.get', parse=ParseMethod.U64, stack=0),
    0x26: II(opcode=0x26, name='table.set', parse=ParseMethod.U64, stack=-2),
    # 0x27: reserved,
    0x28: II(opcode=0x28, name='i32.load', parse=ParseMethod.MEM, stack=0, code='{-1} = int.from_bytes(mem0[{-1} + {imm}:{-1} + {imm} + 4], "little")'),
    0x29: II(opcode=0x29, name='i64.load', parse=ParseMethod.MEM, stack=0, code='{-1} = int.from_bytes(mem0[{-1} + {imm}:{-1} + {imm} + 8], "little")'),
    0x2A: II(opcode=0x2A, name='f32.load', parse=ParseMethod.MEM, stack=0, code='{-1} = unpack_from("<f", mem0, {-1} + {imm})[0]', builtins=('unpack_from',)),
    0x2B: II(opcode=0x2B, name='f64.load', parse=ParseMethod.MEM, stack=0, code='{-1} = unpack_from("<d", mem0, {-1} + {imm})[0]', builtins=('unpack_from',)),
    0x2C: II(opcode=0x2C, name='i32.load8_s', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}]\nif {-1} & 0x80:\n\t{-1} |= 0xFFFFFF00'),
    0x2D: II(opcode=0x2D, name='i32.load8_u', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}]'),
    0x2E: II(opcode=0x2E, name='i32.load16_s', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}] | (mem0[{-1} + {imm} + 1] << 8)\nif {-1} & 0x8000:\n\t{-1} |= 0xFFFF0000'),
    0x2F: II(opcode=0x2F, name='i32.load16_u', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}] | (mem0[{-1} + {imm} + 1] << 8)'),
    0x30: II(opcode=0x30, name='i64.load8_s', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}]\nif {-1} & 0x80:\n\t{-1} |= 0xFFFFFFFFFFFFFF00'),
    0x31: II(opcode=0x31, name='i64.load8_u', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}]'),
    0x32: II(opcode=0x32, name='i64.load16_s', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}] | (mem0[{-1} + {imm} + 1] << 8)\nif {-1} & 0x8000:\n\t{-1} |= 0xFFFFFFFFFFFF0000'),
    0x33: II(opcode=0x33, name='i64.load16_u', parse=ParseMethod.MEM, stack=0, code='{-1} = mem0[{-1} + {imm}] | (mem0[{-1} + {imm} + 1] << 8)'),
    0x34: II(opcode=0x34, name='i64.load32_s', parse=ParseMethod.MEM, stack=0, code='{-1} = int.from_bytes(mem0[{-1} + {imm}:{-1} + {imm} + 4], "little")\nif {-1} & 0x80000000:\n\t{-1} |= 0xFFFFFFFF00000000'),
    0x35: II(opcode=0x35, name='i64.load32_u', parse=ParseMethod.MEM, stack=0, code='{-1} = int.from_bytes(mem0[{-1} + {imm}:{-1} + {imm} + 4], "little")'),
    0x36: II(opcode=0x36, name='i32.store', parse=ParseMethod.MEM, stack=-2, code='mem0[{-2} + {imm}:{-2} + {imm} + 4] = {-1}.to_bytes(4, "little")'),
    0x37: II(opcode=0x37, name='i64.store', parse=ParseMethod.MEM, stack=-2, code='mem0[{-2} + {imm}:{-2} + {imm} + 8] = {-1}.to_bytes(8, "little")'),
    0x38: II(opcode=0x38, name='f32.store', parse=ParseMethod.MEM, stack=-2, code='pack_into("<f", mem0, {-2} + {imm}, {-1})', builtins=('pack_into',)),
    0x39: II(opcode=0x39, name='f64.store', parse=ParseMethod.MEM, stack=-2, code='pack_into("<d", mem0, {-2} + {imm}, {-1})', builtins=('pack_into',)),
    0x3A: II(opcode=0x3A, name='i32.store8', parse=ParseMethod.MEM, stack=-2, code='mem0[{-2} + {imm}] = {-1} & 0xFF'),
    0x3B: II(opcode=0x3B, name='i32.store16', parse=ParseMethod.MEM, stack=-2, code='mem0[{-2} + {imm}] = {-1} & 0xFF\nmem0[{-2} + {imm} + 1] = ({-1} >> 8) & 0xFF'),
    0x3C: II(opcode=0x3C, name='i64.store8', parse=ParseMethod.MEM, stack=-2, code='mem0[{-2} + {imm}] = {-1} & 0xFF'),
    0x3D: II(opcode=0x3D, name='i64.store16', parse=ParseMethod.MEM, stack=-2, code='mem0[{-2} + {imm}] = {-1} & 0xFF\nmem0[{-2} + {imm} + 1] = ({-1} >> 8) & 0xFF'),
    0x3E: II(opcode=0x3E, name='i64.store32', parse=ParseMethod.MEM, stack=-2, code='mem0[{-2} + {imm}:{-2} + {imm} + 4] = ({-1} & 0xFFFFFFFF).to_bytes(4, "little")'),
    0x3F: II(opcode=0x3F, name='memory.size', parse=ParseMethod.U64, stack=+1, code='{0} = len(m::{imm}) // 0x10000'),
    0x40: II(opcode=0x40, name='memory.grow', parse=ParseMethod.U64, stack=0, code='{-1} = memory_grow(m::{imm}, {-1}, self._W_m_lim{imm})', builtins=('_W_memory_grow',)),
    0x41: II(opcode=0x41, name='i32.const', parse=ParseMethod.U32, stack=+1, code='{0} = {imm}'),
    0x42: II(opcode=0x42, name='i64.const', parse=ParseMethod.U64, stack=+1, code='{0} = {imm}'),
    0x43: II(opcode=0x43, name='f32.const', parse=ParseMethod.CUSTOM, stack=+1),
    0x44: II(opcode=0x44, name='f64.const', parse=ParseMethod.CUSTOM, stack=+1),
    0x45: II(opcode=0x45, name='i32.eqz', stack=0, code='{-1} = 1 if {-1} == 0 else 0'),
    0x46: II(opcode=0x46, name='i32.eq', stack=-1, code='{-2} = 1 if {-2} == {-1} else 0'),
    0x47: II(opcode=0x47, name='i32.ne', stack=-1, code='{-2} = 1 if {-2} != {-1} else 0'),
    0x48: II(opcode=0x48, name='i32.lt_s', stack=-1, code='{-2} = 1 if ({-2} - {-1}) & 0x80000000 else 0'),
    0x49: II(opcode=0x49, name='i32.lt_u', stack=-1, code='{-2} = 1 if {-2} < {-1} else 0'),
    0x4A: II(opcode=0x4A, name='i32.gt_s', stack=-1, code='{-2} = 1 if ({-1} - {-2}) & 0x80000000 else 0'),
    0x4B: II(opcode=0x4B, name='i32.gt_u', stack=-1, code='{-2} = 1 if {-2} > {-1} else 0'),
    0x4C: II(opcode=0x4C, name='i32.le_s', stack=-1, code='{-2} = 0 if ({-1} - {-2}) & 0x80000000 else 1'),
    0x4D: II(opcode=0x4D, name='i32.le_u', stack=-1, code='{-2} = 1 if {-2} <= {-1} else 0'),
    0x4E: II(opcode=0x4E, name='i32.ge_s', stack=-1, code='{-2} = 0 if ({-2} - {-1}) & 0x80000000 else 1'),
    0x4F: II(opcode=0x4F, name='i32.ge_u', stack=-1, code='{-2} = 1 if {-2} >= {-1} else 0'),
    0x50: II(opcode=0x50, name='i64.eqz', stack=0, code='{-1} = 1 if {-1} == 0 else 0'),
    0x51: II(opcode=0x51, name='i64.eq', stack=-1, code='{-2} = 1 if {-2} == {-1} else 0'),
    0x52: II(opcode=0x52, name='i64.ne', stack=-1, code='{-2} = 1 if {-2} != {-1} else 0'),
    0x53: II(opcode=0x53, name='i64.lt_s', stack=-1, code='{-2} = 1 if ({-2} - {-1}) & 0x8000000000000000 else 0'),
    0x54: II(opcode=0x54, name='i64.lt_u', stack=-1, code='{-2} = 1 if {-2} < {-1} else 0'),
    0x55: II(opcode=0x55, name='i64.gt_s', stack=-1, code='{-2} = 1 if ({-1} - {-2}) & 0x8000000000000000 else 0'),
    0x56: II(opcode=0x56, name='i64.gt_u', stack=-1, code='{-2} = 1 if {-2} > {-1} else 0'),
    0x57: II(opcode=0x57, name='i64.le_s', stack=-1, code='{-2} = 0 if ({-1} - {-2}) & 0x8000000000000000 else 1'),
    0x58: II(opcode=0x58, name='i64.le_u', stack=-1, code='{-2} = 1 if {-2} <= {-1} else 0'),
    0x59: II(opcode=0x59, name='i64.ge_s', stack=-1, code='{-2} = 0 if ({-2} - {-1}) & 0x8000000000000000 else 1'),
    0x5A: II(opcode=0x5A, name='i64.ge_u', stack=-1, code='{-2} = 1 if {-2} >= {-1} else 0'),
    0x5B: II(opcode=0x5B, name='f32.eq', stack=-1, code='{-2} = 1 if {-2} == {-1} else 0'),
    0x5C: II(opcode=0x5C, name='f32.ne', stack=-1, code='{-2} = 1 if {-2} != {-1} else 0'),
    0x5D: II(opcode=0x5D, name='f32.lt', stack=-1, code='{-2} = 1 if {-2} < {-1} else 0'),
    0x5E: II(opcode=0x5E, name='f32.gt', stack=-1, code='{-2} = 1 if {-2} > {-1} else 0'),
    0x5F: II(opcode=0x5F, name='f32.le', stack=-1, code='{-2} = 1 if {-2} <= {-1} else 0'),
    0x60: II(opcode=0x60, name='f32.ge', stack=-1, code='{-2} = 1 if {-2} >= {-1} else 0'),
    0x61: II(opcode=0x61, name='f64.eq', stack=-1, code='{-2} = 1 if {-2} == {-1} else 0'),
    0x62: II(opcode=0x62, name='f64.ne', stack=-1, code='{-2} = 1 if {-2} != {-1} else 0'),
    0x63: II(opcode=0x63, name='f64.lt', stack=-1, code='{-2} = 1 if {-2} < {-1} else 0'),
    0x64: II(opcode=0x64, name='f64.gt', stack=-1, code='{-2} = 1 if {-2} > {-1} else 0'),
    0x65: II(opcode=0x65, name='f64.le', stack=-1, code='{-2} = 1 if {-2} <= {-1} else 0'),
    0x66: II(opcode=0x66, name='f64.ge', stack=-1, code='{-2} = 1 if {-2} >= {-1} else 0'),
    0x67: II(opcode=0x67, name='i32.clz', stack=0, code='{-1} = 32 - {-1}.bit_length()'),
    0x68: II(opcode=0x68, name='i32.ctz', stack=0, code='for i in range(33):\n\tif {-1} & (1 << i):\n\t\tbreak\n{-1} = i'),
    0x69: II(opcode=0x69, name='i32.popcnt', stack=0, code='{-1} = {-1}.bit_count()'),
    0x6A: II(opcode=0x6A, name='i32.add', stack=-1, code='{-2} = ({-2} + {-1}) & 0xFFFFFFFF'),
    0x6B: II(opcode=0x6B, name='i32.sub', stack=-1, code='{-2} = ({-2} - {-1}) & 0xFFFFFFFF'),
    0x6C: II(opcode=0x6C, name='i32.mul', stack=-1, code='{-2} = ({-2} * {-1}) & 0xFFFFFFFF'),
    0x6D: II(opcode=0x6D, name='i32.div_s', stack=-1, code='{-2} = _div_s32({-2}, {-1})', builtins=('div_s32',)),
    0x6E: II(opcode=0x6E, name='i32.div_u', stack=-1, code='{-2} = {-2} // {-1}'),
    0x6F: II(opcode=0x6F, name='i32.rem_s', stack=-1, code='{-2} = _rem_s32({-2}, {-1})', builtins=('rem_s32',)),
    0x70: II(opcode=0x70, name='i32.rem_u', stack=-1, code='{-2} = {-2} % {-1}'),
    0x71: II(opcode=0x71, name='i32.and', stack=-1, code='{-2} = {-2} & {-1}'),
    0x72: II(opcode=0x72, name='i32.or', stack=-1, code='{-2} = {-2} | {-1}'),
    0x73: II(opcode=0x73, name='i32.xor', stack=-1, code='{-2} = {-2} ^ {-1}'),
    0x74: II(opcode=0x74, name='i32.shl', stack=-1, code='{-2} = ({-2} << ({-1} & 31)) & 0xFFFFFFFF'),
    0x75: II(opcode=0x75, name='i32.shr_s', stack=-1, code='{-2} = (({-2} + ({-2} & 0x80000000) * 0x1FFFFFFFE) >> ({-1} & 31)) & 0xFFFFFFFF'),
    0x76: II(opcode=0x76, name='i32.shr_u', stack=-1, code='{-2} = {-2} >> ({-1} & 31)'),
    0x77: II(opcode=0x77, name='i32.rotl', stack=-1, code='{-2} = ((({-2} | ({-2} << 32)) << ({-1} & 31)) >> 32) & 0xFFFFFFFF'),
    0x78: II(opcode=0x78, name='i32.rotr', stack=-1, code='{-2} = (({-2} | ({-2} << 32)) >> ({-1} & 31)) & 0xFFFFFFFF'),
    0x79: II(opcode=0x79, name='i64.clz', stack=0, code='{-1} = 64 - {-1}.bit_length()'),
    0x7A: II(opcode=0x7A, name='i64.ctz', stack=0, code='for i in range(64):\n\tif {-1} & (1 << i):\n\t\t{-1} = i\n\t\tbreak\nelse:\n\ti = 64'),
    0x7B: II(opcode=0x7B, name='i64.popcnt', stack=0, code='{-1} = {-1}.bit_count()'),
    0x7C: II(opcode=0x7C, name='i64.add', stack=-1, code='{-2} = ({-2} + {-1}) & 0xFFFFFFFFFFFFFFFF'),
    0x7D: II(opcode=0x7D, name='i64.sub', stack=-1, code='{-2} = ({-2} - {-1}) & 0xFFFFFFFFFFFFFFFF'),
    0x7E: II(opcode=0x7E, name='i64.mul', stack=-1, code='{-2} = ({-2} * {-1}) & 0xFFFFFFFFFFFFFFFF'),
    0x7F: II(opcode=0x7F, name='i64.div_s', stack=-1, code='{-2} = _div_s64({-2}, {-1})', builtins=('div_s64',)),
    0x80: II(opcode=0x80, name='i64.div_u', stack=-1, code='{-2} = {-2} // {-1} if {-1} != 0 else {-2}'),
    0x81: II(opcode=0x81, name='i64.rem_s', stack=-1, code='{-2} = _rem_s64({-2}, {-1})', builtins=('rem_s64',)),
    0x82: II(opcode=0x82, name='i64.rem_u', stack=-1, code='{-2} = {-2} % {-1} if {-1} != 0 else {-2}'),
    0x83: II(opcode=0x83, name='i64.and', stack=-1, code='{-2} = {-2} & {-1}'),
    0x84: II(opcode=0x84, name='i64.or', stack=-1, code='{-2} = {-2} | {-1}'),
    0x85: II(opcode=0x85, name='i64.xor', stack=-1, code='{-2} = {-2} ^ {-1}'),
    0x86: II(opcode=0x86, name='i64.shl', stack=-1, code='{-2} = ({-2} << ({-1} & 63)) & 0xFFFFFFFFFFFFFFFF'),
    0x87: II(opcode=0x87, name='i64.shr_s', stack=-1, code='{-1} &= 63\nt = {-2} >> 63\n{-2} = {-2} >> {-1}\nif t:\n\t{-2} |= (0x7FFFFFFFFFFFFFFF) >> {-1} ^ 0xFFFFFFFFFFFFFFFF'),
    0x88: II(opcode=0x88, name='i64.shr_u', stack=-1, code='{-2} = {-2} >> ({-1} & 63)'),
    0x89: II(opcode=0x89, name='i64.rotl', stack=-1, code='{-1} &= 63\n{-2} = (({-2} << {-1}) | ({-2} >> (64 - {-1}))) & 0xFFFFFFFFFFFFFFFF'),
    0x8A: II(opcode=0x8A, name='i64.rotr', stack=-1, code='{-1} &= 63\n{-2} = (({-2} >> {-1}) | ({-2} << (64 - {-1}))) & 0xFFFFFFFFFFFFFFFF'),
    0x8B: II(opcode=0x8B, name='f32.abs', stack=0, code='{-1} = abs({-1})'),
    0x8C: II(opcode=0x8C, name='f32.neg', stack=0, code='{-1} = -{-1}'),
    0x8D: II(opcode=0x8D, name='f32.ceil', stack=0, code='{-1} = float(ceil({-1}))', builtins=('ceil',)),
    0x8E: II(opcode=0x8E, name='f32.floor', stack=0, code='{-1} = float(floor({-1}))', builtins=('floor',)),
    0x8F: II(opcode=0x8F, name='f32.trunc', stack=0, code='{-1} = float(trunc({-1}))', builtins=('trunc',)),
    0x90: II(opcode=0x90, name='f32.nearest', stack=0, code='{-1} = float(round({-1}))'),
    0x91: II(opcode=0x91, name='f32.sqrt', stack=0, code='{-1} = sqrt({-1})', builtins=('sqrt',)),
    0x92: II(opcode=0x92, name='f32.add', stack=-1, code='{-2} = {-2} + {-1}'),
    0x93: II(opcode=0x93, name='f32.sub', stack=-1, code='{-2} = {-2} - {-1}'),
    0x94: II(opcode=0x94, name='f32.mul', stack=-1, code='{-2} = {-2} * {-1}'),
    0x95: II(opcode=0x95, name='f32.div', stack=-1, code='{-2} = {-2} / {-1}'),
    0x96: II(opcode=0x96, name='f32.min', stack=-1, code='{-2} = min({-2}, {-1})'),
    0x97: II(opcode=0x97, name='f32.max', stack=-1, code='{-2} = max({-2}, {-1})'),
    0x98: II(opcode=0x98, name='f32.copysign', stack=-1, code='{-2} = copysign({-2}, {-1})', builtins=('copysign',)),
    0x99: II(opcode=0x99, name='f64.abs', stack=0, code='{-1} = abs({-1})'),
    0x9A: II(opcode=0x9A, name='f64.neg', stack=0, code='{-1} = -{-1}'),
    0x9B: II(opcode=0x9B, name='f64.ceil', stack=0, code='{-1} = float(ceil({-1}))'),
    0x9C: II(opcode=0x9C, name='f64.floor', stack=0, code='{-1} = float(floor({-1}))'),
    0x9D: II(opcode=0x9D, name='f64.trunc', stack=0, code='{-1} = float(trunc({-1}))'),
    0x9E: II(opcode=0x9E, name='f64.nearest', stack=0, code='{-1} = float(round({-1}))'),
    0x9F: II(opcode=0x9F, name='f64.sqrt', stack=0, code='{-1} = sqrt({-1})'),
    0xA0: II(opcode=0xA0, name='f64.add', stack=-1, code='{-2} = {-2} + {-1}'),
    0xA1: II(opcode=0xA1, name='f64.sub', stack=-1, code='{-2} = {-2} - {-1}'),
    0xA2: II(opcode=0xA2, name='f64.mul', stack=-1, code='{-2} = {-2} * {-1}'),
    0xA3: II(opcode=0xA3, name='f64.div', stack=-1, code='{-2} = {-2} / {-1}'),
    0xA4: II(opcode=0xA4, name='f64.min', stack=-1, code='{-2} = min({-2}, {-1})'),
    0xA5: II(opcode=0xA5, name='f64.max', stack=-1, code='{-2} = max({-2}, {-1})'),
    0xA6: II(opcode=0xA6, name='f64.copysign', stack=-1, code='{-2} = copysign({-2}, {-1})', builtins=('copysign',)),
    0xA7: II(opcode=0xA7, name='i32.wrap_i64', stack=0, code='{-1} = {-1} & 0xFFFFFFFF'),
    0xA8: II(opcode=0xA8, name='i32.trunc_f32_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFF if abs({-1}) < 2.2e9 else 0', builtins=('trunc',)),
    0xA9: II(opcode=0xA9, name='i32.trunc_f32_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 4294967295.0) else 4294967295', builtins=('trunc',)),
    0xAA: II(opcode=0xAA, name='i32.trunc_f64_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFF if abs({-1}) < 2.2e9 else 0', builtins=('trunc',)),
    0xAB: II(opcode=0xAB, name='i32.trunc_f64_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 4294967295.0) else 4294967295', builtins=('trunc',)),
    0xAC: II(opcode=0xAC, name='i64.extend_i32_s', stack=0, code='if {-1} >> 31:\n\t{-1} |= 0xFFFFFFFF00000000'),
    0xAD: II(opcode=0xAD, name='i64.extend_i32_u', stack=0, code='# {-1}: 32-bits to 64-bits'),
    0xAE: II(opcode=0xAE, name='i64.trunc_f32_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFFFFFFFFFF if abs({-1}) < 9.3e18 else 0', builtins=('trunc',)),
    0xAF: II(opcode=0xAF, name='i64.trunc_f32_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 18446744073709549568.0) else 18446744073709549568', builtins=('trunc',)),
    0xB0: II(opcode=0xB0, name='i64.trunc_f64_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFFFFFFFFFF if abs({-1}) < 9.3e18 else 0', builtins=('trunc',)),
    0xB1: II(opcode=0xB1, name='i64.trunc_f64_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 18446744073709549568.0) else 18446744073709549568', builtins=('trunc',)),
    0xB2: II(opcode=0xB2, name='f32.convert_i32_s', stack=0, code='{-1} = float({-1} - 0x100000000 if {-1} >> 31 else {-1})'),
    0xB3: II(opcode=0xB3, name='f32.convert_i32_u', stack=0, code='{-1} = float({-1})'),
    0xB4: II(opcode=0xB4, name='f32.convert_i64_s', stack=0, code='{-1} = float({-1} - 0x10000000000000000 if {-1} >> 63 else {-1})'),
    0xB5: II(opcode=0xB5, name='f32.convert_i64_u', stack=0, code='{-1} = float({-1})'),
    0xB6: II(opcode=0xB6, name='f32.demote_f64', stack=0, code='# {-1}: 64-bit to 32-bit float'),
    0xB7: II(opcode=0xB7, name='f64.convert_i32_s', stack=0, code='{-1} = float({-1} - 0x100000000 if {-1} >> 31 else {-1})'),
    0xB8: II(opcode=0xB8, name='f64.convert_i32_u', stack=0, code='{-1} = float({-1})'),
    0xB9: II(opcode=0xB9, name='f64.convert_i64_s', stack=0, code='{-1} = float({-1} - 0x10000000000000000 if {-1} >> 63 else {-1})'),
    0xBA: II(opcode=0xBA, name='f64.convert_i64_u', stack=0, code='{-1} = float({-1})'),
    0xBB: II(opcode=0xBB, name='f64.promote_f32', stack=0, code='# {-1}: 32-bit to 64-bit float'),
    0xBC: II(opcode=0xBC, name='i32.reinterpret_f32', stack=0, code='{-1} = int.from_bytes(pack("<f", {-1}), "little")', builtins=('pack',)),
    0xBD: II(opcode=0xBD, name='i64.reinterpret_f64', stack=0, code='{-1} = int.from_bytes(pack("<d", {-1}), "little")', builtins=('pack',)),
    0xBE: II(opcode=0xBE, name='f32.reinterpret_i32', stack=0, code='{-1} = unpack("<f", {-1}.to_bytes(4, "little"))[0]', builtins=('unpack',)),
    0xBF: II(opcode=0xBF, name='f64.reinterpret_i64', stack=0, code='{-1} = unpack("<d", {-1}.to_bytes(8, "little"))[0]', builtins=('unpack',)),
    0xC0: II(opcode=0xC0, name='i32.extend8_s', stack=0, code='if {-1} & 0x80:\n\t{-1} |= 0xFFFFFF00\nelse:\n\t{-1} &= 0xFF'),
    0xC1: II(opcode=0xC1, name='i32.extend16_s', stack=0, code='if {-1} & 0x8000:\n\t{-1} |= 0xFFFF0000\nelse:\n\t{-1} &= 0xFFFF'),
    0xC2: II(opcode=0xC2, name='i64.extend8_s', stack=0, code='if {-1} & 0x80:\n\t{-1} |= 0xFFFFFFFFFFFFFF00\nelse:\n\t{-1} &= 0xFF'),
    0xC3: II(opcode=0xC3, name='i64.extend16_s', stack=0, code='if {-1} & 0x8000:\n\t{-1} |= 0xFFFFFFFFFFFF0000\nelse:\n\t{-1} &= 0xFFFF'),
    0xC4: II(opcode=0xC4, name='i64.extend32_s', stack=0, code='if {-1} & 0x80000000:\n\t{-1} |= 0xFFFFFFFF00000000\nelse:\n\t{-1} &= 0xFFFFFFFF'),
    # 0xC5: reserved,
    # ... : reserved,
    # 0xCF: reserved,
    0xD0: II(opcode=0xD0, name='ref.null', parse=ParseMethod.BYTE, stack=+1, code='{0} = None'),
    0xD1: II(opcode=0xD1, name='ref.is_null', stack=0, code='{-1} = 1 if {-1} is None else 0'),
    0xD2: II(opcode=0xD2, name='ref.func', parse=ParseMethod.U64, stack=+1, code='{0} = f::{imm}'),
    # 0xD3: reserved,
    # ... : reserved,
    # 0xFB: reserved,
    0x00FC: II(opcode=0x00FC, name='i32.trunc_sat_f32_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFF if abs({-1}) < 2.1e9 else _trunc_sat_s32({-1})', builtins=('trunc', 'trunc_sat_s32')),
    0x01FC: II(opcode=0x01FC, name='i32.trunc_sat_f32_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 4294967295.0) else _trunc_sat_u32({-1})', builtins=('trunc', 'trunc_sat_u32')),
    0x02FC: II(opcode=0x02FC, name='i32.trunc_sat_f64_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFF if abs({-1}) < 2.1e9 else _trunc_sat_s32({-1})', builtins=('trunc', 'trunc_sat_s32')),
    0x03FC: II(opcode=0x03FC, name='i32.trunc_sat_f64_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 4294967295.0) else _trunc_sat_u32({-1})', builtins=('trunc', 'trunc_sat_u32')),
    0x04FC: II(opcode=0x04FC, name='i64.trunc_sat_f32_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFFFFFFFFFF if abs({-1}) < 9.2e18 else  _trunc_sat_s64({-1})', builtins=('trunc', 'trunc_sat_s64')),
    0x05FC: II(opcode=0x05FC, name='i64.trunc_sat_f32_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 18446744073709549568.0) else  _trunc_sat_u64({-1})', builtins=('trunc', 'trunc_sat_u64')),
    0x06FC: II(opcode=0x06FC, name='i64.trunc_sat_f64_s', stack=0, code='{-1} = trunc({-1}) & 0xFFFFFFFFFFFFFFFF if abs({-1}) < 9.2e18 else  _trunc_sat_s64({-1})', builtins=('trunc', 'trunc_sat_s64')),
    0x07FC: II(opcode=0x07FC, name='i64.trunc_sat_f64_u', stack=0, code='{-1} = trunc({-1}) if ({-1} >= 0.0) and ({-1} < 18446744073709549568.0) else  _trunc_sat_u64({-1})', builtins=('trunc', 'trunc_sat_u64')),
    0x08FC: II(opcode=0x08FC, name='memory.init', parse=ParseMethod.U64U64, stack=-3, code='m::{imm1}[{-3}:{-3} + {-1}] = self._W_dat{imm0}[{-2}:{-2} + {-1}]'),
    0x09FC: II(opcode=0x09FC, name='data.drop', parse=ParseMethod.U64, stack=0, code='self._W_dat{imm} = b""'),
    0x0AFC: II(opcode=0x0AFC, name='memory.copy', parse=ParseMethod.U64U64, stack=-3, code='m::{imm0}[{-3}:{-3} + {-1}] = m::{imm1}[{-2}:{-2} + {-1}]'),
    0x0BFC: II(opcode=0x0BFC, name='memory.fill', parse=ParseMethod.U64, stack=-3, code='m::{imm}[{-3}:{-3} + {-1}] = bytes([{-2} & 0xFF]) * {-1}'),
    0x0CFC: II(opcode=0x0CFC, name='table.init', parse=ParseMethod.U64U64, stack=-3, code='t::{imm1}[{-3}:{-3} + {-1}] = self._W_el{imm0}[{-2}:{-2} + {-1}]'),
    0x0DFC: II(opcode=0x0DFC, name='elem.drop', parse=ParseMethod.U64, stack=0, code='self._W_el{imm} = []'),
    0x0EFC: II(opcode=0x0EFC, name='table.copy', parse=ParseMethod.U64U64, stack=-3, code='t::{imm0}[{-3}:{-3} + {-1}] = t::{imm1}[{-2}:{-2} + {-1}]'),
    0x0FFC: II(opcode=0x0FFC, name='table.grow', parse=ParseMethod.U64, stack=-1, code='{-1} = self._W_table_grow(t::{imm}, {-2}, {-1}, self._W_t_lim{imm})', builtins=('_W_table_grow',)),
    0x10FC: II(opcode=0x10FC, name='table.size', parse=ParseMethod.U64, stack=+1, code='{0} = len(t::{imm})'),
    0x11FC: II(opcode=0x11FC, name='table.fill', parse=ParseMethod.U64, stack=-3, code='t::{imm}[{-3}:{-3} + {-1}] = [{-2}] * {-1}'),
    0x00FD: II(opcode=0x00FD, name='v128.load', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x01FD: II(opcode=0x01FD, name='v128.load8x8_s', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x02FD: II(opcode=0x02FD, name='v128.load8x8_u', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x03FD: II(opcode=0x03FD, name='v128.load16x4_s', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x04FD: II(opcode=0x04FD, name='v128.load16x4_u', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x05FD: II(opcode=0x05FD, name='v128.load32x2_s', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x06FD: II(opcode=0x06FD, name='v128.load32x2_u', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x07FD: II(opcode=0x07FD, name='v128.load8_splat', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x08FD: II(opcode=0x08FD, name='v128.load16_splat', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x09FD: II(opcode=0x09FD, name='v128.load32_splat', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x0AFD: II(opcode=0x0AFD, name='v128.load64_splat', parse=ParseMethod.MEM, stack=0, code='# Not implemented', builtins=('simd',)),
    0x0BFD: II(opcode=0x0BFD, name='v128.store', parse=ParseMethod.MEM, stack=-2, code='# Not implemented', builtins=('simd',)),
    0x0CFD: II(opcode=0x0CFD, name='v128.const', parse=ParseMethod.CUSTOM, stack=+1, code='# Not implemented', builtins=('simd',)),
    0x0DFD: II(opcode=0x0DFD, name='i8x16.shuffle', parse=ParseMethod.CUSTOM, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x0EFD: II(opcode=0x0EFD, name='i8x16.swizzle', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x0FFD: II(opcode=0x0FFD, name='i8x16.splat', stack=0, code='# Not implemented', builtins=('simd',)),
    0x10FD: II(opcode=0x10FD, name='i16x8.splat', stack=0, code='# Not implemented', builtins=('simd',)),
    0x11FD: II(opcode=0x11FD, name='i32x4.splat', stack=0, code='# Not implemented', builtins=('simd',)),
    0x12FD: II(opcode=0x12FD, name='i64x2.splat', stack=0, code='# Not implemented', builtins=('simd',)),
    0x13FD: II(opcode=0x13FD, name='f32x4.splat', stack=0, code='# Not implemented', builtins=('simd',)),
    0x14FD: II(opcode=0x14FD, name='f64x2.splat', stack=0, code='# Not implemented', builtins=('simd',)),
    0x15FD: II(opcode=0x15FD, name='i8x16.extract_lane_s', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x16FD: II(opcode=0x16FD, name='i8x16.extract_lane_u', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x17FD: II(opcode=0x17FD, name='i8x16.replace_lane', parse=ParseMethod.BYTE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x18FD: II(opcode=0x18FD, name='i16x8.extract_lane_s', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x19FD: II(opcode=0x19FD, name='i16x8.extract_lane_u', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x1AFD: II(opcode=0x1AFD, name='i16x8.replace_lane', parse=ParseMethod.BYTE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x1BFD: II(opcode=0x1BFD, name='i32x4.extract_lane', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x1CFD: II(opcode=0x1CFD, name='i32x4.replace_lane', parse=ParseMethod.BYTE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x1DFD: II(opcode=0x1DFD, name='i64x2.extract_lane', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x1EFD: II(opcode=0x1EFD, name='i64x2.replace_lane', parse=ParseMethod.BYTE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x1FFD: II(opcode=0x1FFD, name='f32x4.extract_lane', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x20FD: II(opcode=0x20FD, name='f32x4.replace_lane', parse=ParseMethod.BYTE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x21FD: II(opcode=0x21FD, name='f64x2.extract_lane', parse=ParseMethod.BYTE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x22FD: II(opcode=0x22FD, name='f64x2.replace_lane', parse=ParseMethod.BYTE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x23FD: II(opcode=0x23FD, name='i8x16.eq', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x24FD: II(opcode=0x24FD, name='i8x16.ne', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x25FD: II(opcode=0x25FD, name='i8x16.lt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x26FD: II(opcode=0x26FD, name='i8x16.lt_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x27FD: II(opcode=0x27FD, name='i8x16.gt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x28FD: II(opcode=0x28FD, name='i8x16.gt_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x29FD: II(opcode=0x29FD, name='i8x16.le_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x2AFD: II(opcode=0x2AFD, name='i8x16.le_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x2BFD: II(opcode=0x2BFD, name='i8x16.ge_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x2CFD: II(opcode=0x2CFD, name='i8x16.ge_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x2DFD: II(opcode=0x2DFD, name='i16x8.eq', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x2EFD: II(opcode=0x2EFD, name='i16x8.ne', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x2FFD: II(opcode=0x2FFD, name='i16x8.lt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x30FD: II(opcode=0x30FD, name='i16x8.lt_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x31FD: II(opcode=0x31FD, name='i16x8.gt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x32FD: II(opcode=0x32FD, name='i16x8.gt_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x33FD: II(opcode=0x33FD, name='i16x8.le_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x34FD: II(opcode=0x34FD, name='i16x8.le_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x35FD: II(opcode=0x35FD, name='i16x8.ge_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x36FD: II(opcode=0x36FD, name='i16x8.ge_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x37FD: II(opcode=0x37FD, name='i32x4.eq', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x38FD: II(opcode=0x38FD, name='i32x4.ne', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x39FD: II(opcode=0x39FD, name='i32x4.lt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x3AFD: II(opcode=0x3AFD, name='i32x4.lt_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x3BFD: II(opcode=0x3BFD, name='i32x4.gt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x3CFD: II(opcode=0x3CFD, name='i32x4.gt_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x3DFD: II(opcode=0x3DFD, name='i32x4.le_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x3EFD: II(opcode=0x3EFD, name='i32x4.le_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x3FFD: II(opcode=0x3FFD, name='i32x4.ge_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x40FD: II(opcode=0x40FD, name='i32x4.ge_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x41FD: II(opcode=0x41FD, name='f32x4.eq', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x42FD: II(opcode=0x42FD, name='f32x4.ne', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x43FD: II(opcode=0x43FD, name='f32x4.lt', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x44FD: II(opcode=0x44FD, name='f32x4.gt', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x45FD: II(opcode=0x45FD, name='f32x4.le', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x46FD: II(opcode=0x46FD, name='f32x4.ge', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x47FD: II(opcode=0x47FD, name='f64x2.eq', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x48FD: II(opcode=0x48FD, name='f64x2.ne', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x49FD: II(opcode=0x49FD, name='f64x2.lt', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x4AFD: II(opcode=0x4AFD, name='f64x2.gt', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x4BFD: II(opcode=0x4BFD, name='f64x2.le', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x4CFD: II(opcode=0x4CFD, name='f64x2.ge', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x4DFD: II(opcode=0x4DFD, name='v128.not', stack=0, code='# Not implemented', builtins=('simd',)),
    0x4EFD: II(opcode=0x4EFD, name='v128.and', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x4FFD: II(opcode=0x4FFD, name='v128.andnot', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x50FD: II(opcode=0x50FD, name='v128.or', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x51FD: II(opcode=0x51FD, name='v128.xor', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x52FD: II(opcode=0x52FD, name='v128.bitselect', stack=-2, code='# Not implemented', builtins=('simd',)),
    0x53FD: II(opcode=0x53FD, name='v128.any_true', stack=0, code='# Not implemented', builtins=('simd',)),
    0x54FD: II(opcode=0x54FD, name='v128.load8_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x55FD: II(opcode=0x55FD, name='v128.load16_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x56FD: II(opcode=0x56FD, name='v128.load32_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x57FD: II(opcode=0x57FD, name='v128.load64_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x58FD: II(opcode=0x58FD, name='v128.store8_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x59FD: II(opcode=0x59FD, name='v128.store16_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x5AFD: II(opcode=0x5AFD, name='v128.store32_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x5BFD: II(opcode=0x5BFD, name='v128.store64_lane', parse=ParseMethod.MEM_LANE, stack=-1, code='# Not implemented', builtins=('simd',)),
    0x5CFD: II(opcode=0x5CFD, name='v128.load32_zero', parse=ParseMethod.MEM_LANE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x5DFD: II(opcode=0x5DFD, name='v128.load64_zero', parse=ParseMethod.MEM_LANE, stack=0, code='# Not implemented', builtins=('simd',)),
    0x5EFD: II(opcode=0x5EFD, name='f32x4.demote_f64x2_zero', stack=0, code='# Not implemented', builtins=('simd',)),
    0x5FFD: II(opcode=0x5FFD, name='f64x2.promote_low_f32x4', stack=0, code='# Not implemented', builtins=('simd',)),
    0x60FD: II(opcode=0x60FD, name='i8x16.abs', stack=0, code='# Not implemented', builtins=('simd',)),
    0x61FD: II(opcode=0x61FD, name='i8x16.neg', stack=0, code='# Not implemented', builtins=('simd',)),
    0x62FD: II(opcode=0x62FD, name='i8x16.popcnt', stack=0, code='# Not implemented', builtins=('simd',)),
    0x63FD: II(opcode=0x63FD, name='i8x16.all_true', stack=0, code='# Not implemented', builtins=('simd',)),
    0x64FD: II(opcode=0x64FD, name='i8x16.bitmask', stack=0, code='# Not implemented', builtins=('simd',)),
    0x65FD: II(opcode=0x65FD, name='i8x16.narrow_i16x8_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x66FD: II(opcode=0x66FD, name='i8x16.narrow_i16x8_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x67FD: II(opcode=0x67FD, name='f32x4.ceil', stack=0, code='# Not implemented', builtins=('simd',)),
    0x68FD: II(opcode=0x68FD, name='f32x4.floor', stack=0, code='# Not implemented', builtins=('simd',)),
    0x69FD: II(opcode=0x69FD, name='f32x4.trunc', stack=0, code='# Not implemented', builtins=('simd',)),
    0x6AFD: II(opcode=0x6AFD, name='f32x4.nearest', stack=0, code='# Not implemented', builtins=('simd',)),
    0x6BFD: II(opcode=0x6BFD, name='i8x16.shl', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x6CFD: II(opcode=0x6CFD, name='i8x16.shr_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x6DFD: II(opcode=0x6DFD, name='i8x16.shr_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x6EFD: II(opcode=0x6EFD, name='i8x16.add', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x6FFD: II(opcode=0x6FFD, name='i8x16.add_sat_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x70FD: II(opcode=0x70FD, name='i8x16.add_sat_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x71FD: II(opcode=0x71FD, name='i8x16.sub', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x72FD: II(opcode=0x72FD, name='i8x16.sub_sat_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x73FD: II(opcode=0x73FD, name='i8x16.sub_sat_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x74FD: II(opcode=0x74FD, name='f64x2.ceil', stack=0, code='# Not implemented', builtins=('simd',)),
    0x75FD: II(opcode=0x75FD, name='f64x2.floor', stack=0, code='# Not implemented', builtins=('simd',)),
    0x76FD: II(opcode=0x76FD, name='i8x16.min_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x77FD: II(opcode=0x77FD, name='i8x16.min_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x78FD: II(opcode=0x78FD, name='i8x16.max_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x79FD: II(opcode=0x79FD, name='i8x16.max_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x7AFD: II(opcode=0x7AFD, name='f64x2.trunc', stack=0, code='# Not implemented', builtins=('simd',)),
    0x7BFD: II(opcode=0x7BFD, name='i8x16.avgr_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x7CFD: II(opcode=0x7CFD, name='i16x8.extadd_pairwise_i8x16_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0x7DFD: II(opcode=0x7DFD, name='i16x8.extadd_pairwise_i8x16_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0x7EFD: II(opcode=0x7EFD, name='i32x4.extadd_pairwise_i16x8_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0x7FFD: II(opcode=0x7FFD, name='i32x4.extadd_pairwise_i16x8_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0x80FD: II(opcode=0x80FD, name='i16x8.abs', stack=0, code='# Not implemented', builtins=('simd',)),
    0x81FD: II(opcode=0x81FD, name='i16x8.neg', stack=0, code='# Not implemented', builtins=('simd',)),
    0x82FD: II(opcode=0x82FD, name='i16x8.q15mulr_sat_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x83FD: II(opcode=0x83FD, name='i16x8.all_true', stack=0, code='# Not implemented', builtins=('simd',)),
    0x84FD: II(opcode=0x84FD, name='i16x8.bitmask', stack=0, code='# Not implemented', builtins=('simd',)),
    0x85FD: II(opcode=0x85FD, name='i16x8.narrow_i32x4_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x86FD: II(opcode=0x86FD, name='i16x8.narrow_i32x4_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x87FD: II(opcode=0x87FD, name='i16x8.extend_low_i8x16_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0x88FD: II(opcode=0x88FD, name='i16x8.extend_high_i8x16_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0x89FD: II(opcode=0x89FD, name='i16x8.extend_low_i8x16_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0x8AFD: II(opcode=0x8AFD, name='i16x8.extend_high_i8x16_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0x8BFD: II(opcode=0x8BFD, name='i16x8.shl', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x8CFD: II(opcode=0x8CFD, name='i16x8.shr_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x8DFD: II(opcode=0x8DFD, name='i16x8.shr_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x8EFD: II(opcode=0x8EFD, name='i16x8.add', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x8FFD: II(opcode=0x8FFD, name='i16x8.add_sat_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x90FD: II(opcode=0x90FD, name='i16x8.add_sat_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x91FD: II(opcode=0x91FD, name='i16x8.sub', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x92FD: II(opcode=0x92FD, name='i16x8.sub_sat_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x93FD: II(opcode=0x93FD, name='i16x8.sub_sat_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x94FD: II(opcode=0x94FD, name='f64x2.nearest', stack=0, code='# Not implemented', builtins=('simd',)),
    0x95FD: II(opcode=0x95FD, name='i16x8.mul', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x96FD: II(opcode=0x96FD, name='i16x8.min_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x97FD: II(opcode=0x97FD, name='i16x8.min_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x98FD: II(opcode=0x98FD, name='i16x8.max_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x99FD: II(opcode=0x99FD, name='i16x8.max_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x9BFD: II(opcode=0x9BFD, name='i16x8.avgr_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x9CFD: II(opcode=0x9CFD, name='i16x8.extmul_low_i8x16_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x9DFD: II(opcode=0x9DFD, name='i16x8.extmul_high_i8x16_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x9EFD: II(opcode=0x9EFD, name='i16x8.extmul_low_i8x16_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0x9FFD: II(opcode=0x9FFD, name='i16x8.extmul_high_i8x16_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xA0FD: II(opcode=0xA0FD, name='i32x4.abs', stack=0, code='# Not implemented', builtins=('simd',)),
    0xA1FD: II(opcode=0xA1FD, name='i32x4.neg', stack=0, code='# Not implemented', builtins=('simd',)),
    0xA3FD: II(opcode=0xA3FD, name='i32x4.all_true', stack=0, code='# Not implemented', builtins=('simd',)),
    0xA4FD: II(opcode=0xA4FD, name='i32x4.bitmask', stack=0, code='# Not implemented', builtins=('simd',)),
    0xA7FD: II(opcode=0xA7FD, name='i32x4.extend_low_i16x8_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0xA8FD: II(opcode=0xA8FD, name='i32x4.extend_high_i16x8_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0xA9FD: II(opcode=0xA9FD, name='i32x4.extend_low_i16x8_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0xAAFD: II(opcode=0xAAFD, name='i32x4.extend_high_i16x8_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0xABFD: II(opcode=0xABFD, name='i32x4.shl', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xACFD: II(opcode=0xACFD, name='i32x4.shr_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xADFD: II(opcode=0xADFD, name='i32x4.shr_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xAEFD: II(opcode=0xAEFD, name='i32x4.add', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xB1FD: II(opcode=0xB1FD, name='i32x4.sub', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xB5FD: II(opcode=0xB5FD, name='i32x4.mul', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xB6FD: II(opcode=0xB6FD, name='i32x4.min_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xB7FD: II(opcode=0xB7FD, name='i32x4.min_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xB8FD: II(opcode=0xB8FD, name='i32x4.max_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xB9FD: II(opcode=0xB9FD, name='i32x4.max_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xBAFD: II(opcode=0xBAFD, name='i32x4.dot_i16x8_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xBCFD: II(opcode=0xBCFD, name='i32x4.extmul_low_i16x8_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xBDFD: II(opcode=0xBDFD, name='i32x4.extmul_high_i16x8_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xBEFD: II(opcode=0xBEFD, name='i32x4.extmul_low_i16x8_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xBFFD: II(opcode=0xBFFD, name='i32x4.extmul_high_i16x8_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xC0FD: II(opcode=0xC0FD, name='i64x2.abs', stack=0, code='# Not implemented', builtins=('simd',)),
    0xC1FD: II(opcode=0xC1FD, name='i64x2.neg', stack=0, code='# Not implemented', builtins=('simd',)),
    0xC3FD: II(opcode=0xC3FD, name='i64x2.all_true', stack=0, code='# Not implemented', builtins=('simd',)),
    0xC4FD: II(opcode=0xC4FD, name='i64x2.bitmask', stack=0, code='# Not implemented', builtins=('simd',)),
    0xC7FD: II(opcode=0xC7FD, name='i64x2.extend_low_i32x4_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0xC8FD: II(opcode=0xC8FD, name='i64x2.extend_high_i32x4_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0xC9FD: II(opcode=0xC9FD, name='i64x2.extend_low_i32x4_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0xCAFD: II(opcode=0xCAFD, name='i64x2.extend_high_i32x4_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0xCBFD: II(opcode=0xCBFD, name='i64x2.shl', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xCCFD: II(opcode=0xCCFD, name='i64x2.shr_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xCDFD: II(opcode=0xCDFD, name='i64x2.shr_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xCEFD: II(opcode=0xCEFD, name='i64x2.add', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xD1FD: II(opcode=0xD1FD, name='i64x2.sub', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xD5FD: II(opcode=0xD5FD, name='i64x2.mul', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xD6FD: II(opcode=0xD6FD, name='i64x2.eq', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xD7FD: II(opcode=0xD7FD, name='i64x2.ne', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xD8FD: II(opcode=0xD8FD, name='i64x2.lt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xD9FD: II(opcode=0xD9FD, name='i64x2.gt_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xDAFD: II(opcode=0xDAFD, name='i64x2.le_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xDBFD: II(opcode=0xDBFD, name='i64x2.ge_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xDCFD: II(opcode=0xDCFD, name='i64x2.extmul_low_i32x4_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xDDFD: II(opcode=0xDDFD, name='i64x2.extmul_high_i32x4_s', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xDEFD: II(opcode=0xDEFD, name='i64x2.extmul_low_i32x4_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xDFFD: II(opcode=0xDFFD, name='i64x2.extmul_high_i32x4_u', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xE0FD: II(opcode=0xE0FD, name='f32x4.abs', stack=0, code='# Not implemented', builtins=('simd',)),
    0xE1FD: II(opcode=0xE1FD, name='f32x4.neg', stack=0, code='# Not implemented', builtins=('simd',)),
    0xE3FD: II(opcode=0xE3FD, name='f32x4.sqrt', stack=0, code='# Not implemented', builtins=('simd',)),
    0xE4FD: II(opcode=0xE4FD, name='f32x4.add', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xE5FD: II(opcode=0xE5FD, name='f32x4.sub', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xE6FD: II(opcode=0xE6FD, name='f32x4.mul', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xE7FD: II(opcode=0xE7FD, name='f32x4.div', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xE8FD: II(opcode=0xE8FD, name='f32x4.min', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xE9FD: II(opcode=0xE9FD, name='f32x4.max', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xEAFD: II(opcode=0xEAFD, name='f32x4.pmin', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xEBFD: II(opcode=0xEBFD, name='f32x4.pmax', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xECFD: II(opcode=0xECFD, name='f64x2.abs', stack=0, code='# Not implemented', builtins=('simd',)),
    0xEDFD: II(opcode=0xEDFD, name='f64x2.neg', stack=0, code='# Not implemented', builtins=('simd',)),
    0xEFFD: II(opcode=0xEFFD, name='f64x2.sqrt', stack=0, code='# Not implemented', builtins=('simd',)),
    0xF0FD: II(opcode=0xF0FD, name='f64x2.add', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF1FD: II(opcode=0xF1FD, name='f64x2.sub', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF2FD: II(opcode=0xF2FD, name='f64x2.mul', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF3FD: II(opcode=0xF3FD, name='f64x2.div', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF4FD: II(opcode=0xF4FD, name='f64x2.min', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF5FD: II(opcode=0xF5FD, name='f64x2.max', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF6FD: II(opcode=0xF6FD, name='f64x2.pmin', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF7FD: II(opcode=0xF7FD, name='f64x2.pmax', stack=-1, code='# Not implemented', builtins=('simd',)),
    0xF8FD: II(opcode=0xF8FD, name='i32x4.trunc_sat_f32x4_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0xF9FD: II(opcode=0xF9FD, name='i32x4.trunc_sat_f32x4_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0xFAFD: II(opcode=0xFAFD, name='f32x4.convert_i32x4_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0xFBFD: II(opcode=0xFBFD, name='f32x4.convert_i32x4_u', stack=0, code='# Not implemented', builtins=('simd',)),
    0xFCFD: II(opcode=0xFCFD, name='i32x4.trunc_sat_f64x2_s_zero', stack=0, code='# Not implemented', builtins=('simd',)),
    0xFDFD: II(opcode=0xFDFD, name='i32x4.trunc_sat_f64x2_u_zero', stack=0, code='# Not implemented', builtins=('simd',)),
    0xFEFD: II(opcode=0xFEFD, name='f64x2.convert_low_i32x4_s', stack=0, code='# Not implemented', builtins=('simd',)),
    0xFFFD: II(opcode=0xFFFD, name='f64x2.convert_low_i32x4_u', stack=0, code='# Not implemented', builtins=('simd',))
}

class InstrCode(IntEnum):
    UNREACHABLE = 0x00
    NOP = 0x01
    BLOCK = 0x02
    LOOP = 0x03
    IF = 0x04
    ELSE = 0x05
    END = 0x0B
    BR = 0x0C
    BR_IF = 0x0D
    BR_TABLE = 0x0E
    RETURN = 0x0F
    CALL = 0x10
    CALL_INDIRECT = 0x11
    DROP = 0x1A
    SELECT = 0x1B
    SELECT_T = 0x1C
    LOCAL_GET = 0x20
    LOCAL_SET = 0x21
    LOCAL_TEE = 0x22
    GLOBAL_GET = 0x23
    GLOBAL_SET = 0x24
    TABLE_GET = 0x25
    TABLE_SET = 0x26
    I32_LOAD = 0x28
    I64_LOAD = 0x29
    F32_LOAD = 0x2A
    F64_LOAD = 0x2B
    I32_LOAD8_S = 0x2C
    I32_LOAD8_U = 0x2D
    I32_LOAD16_S = 0x2E
    I32_LOAD16_U = 0x2F
    I64_LOAD8_S = 0x30
    I64_LOAD8_U = 0x31
    I64_LOAD16_S = 0x32
    I64_LOAD16_U = 0x33
    I64_LOAD32_S = 0x34
    I64_LOAD32_U = 0x35
    I32_STORE = 0x36
    I64_STORE = 0x37
    F32_STORE = 0x38
    F64_STORE = 0x39
    I32_STORE8 = 0x3A
    I32_STORE16 = 0x3B
    I64_STORE8 = 0x3C
    I64_STORE16 = 0x3D
    I64_STORE32 = 0x3E
    MEMORY_SIZE = 0x3F
    MEMORY_GROW = 0x40
    I32_CONST = 0x41
    I64_CONST = 0x42
    F32_CONST = 0x43
    F64_CONST = 0x44
    I32_EQZ = 0x45
    I32_EQ = 0x46
    I32_NE = 0x47
    I32_LT_S = 0x48
    I32_LT_U = 0x49
    I32_GT_S = 0x4A
    I32_GT_U = 0x4B
    I32_LE_S = 0x4C
    I32_LE_U = 0x4D
    I32_GE_S = 0x4E
    I32_GE_U = 0x4F
    I64_EQZ = 0x50
    I64_EQ = 0x51
    I64_NE = 0x52
    I64_LT_S = 0x53
    I64_LT_U = 0x54
    I64_GT_S = 0x55
    I64_GT_U = 0x56
    I64_LE_S = 0x57
    I64_LE_U = 0x58
    I64_GE_S = 0x59
    I64_GE_U = 0x5A
    F32_EQ = 0x5B
    F32_NE = 0x5C
    F32_LT = 0x5D
    F32_GT = 0x5E
    F32_LE = 0x5F
    F32_GE = 0x60
    F64_EQ = 0x61
    F64_NE = 0x62
    F64_LT = 0x63
    F64_GT = 0x64
    F64_LE = 0x65
    F64_GE = 0x66
    I32_CLZ = 0x67
    I32_CTZ = 0x68
    I32_POPCNT = 0x69
    I32_ADD = 0x6A
    I32_SUB = 0x6B
    I32_MUL = 0x6C
    I32_DIV_S = 0x6D
    I32_DIV_U = 0x6E
    I32_REM_S = 0x6F
    I32_REM_U = 0x70
    I32_AND = 0x71
    I32_OR = 0x72
    I32_XOR = 0x73
    I32_SHL = 0x74
    I32_SHR_S = 0x75
    I32_SHR_U = 0x76
    I32_ROTL = 0x77
    I32_ROTR = 0x78
    I64_CLZ = 0x79
    I64_CTZ = 0x7A
    I64_POPCNT = 0x7B
    I64_ADD = 0x7C
    I64_SUB = 0x7D
    I64_MUL = 0x7E
    I64_DIV_S = 0x7F
    I64_DIV_U = 0x80
    I64_REM_S = 0x81
    I64_REM_U = 0x82
    I64_AND = 0x83
    I64_OR = 0x84
    I64_XOR = 0x85
    I64_SHL = 0x86
    I64_SHR_S = 0x87
    I64_SHR_U = 0x88
    I64_ROTL = 0x89
    I64_ROTR = 0x8A
    F32_ABS = 0x8B
    F32_NEG = 0x8C
    F32_CEIL = 0x8D
    F32_FLOOR = 0x8E
    F32_TRUNC = 0x8F
    F32_NEAREST = 0x90
    F32_SQRT = 0x91
    F32_ADD = 0x92
    F32_SUB = 0x93
    F32_MUL = 0x94
    F32_DIV = 0x95
    F32_MIN = 0x96
    F32_MAX = 0x97
    F32_COPYSIGN = 0x98
    F64_ABS = 0x99
    F64_NEG = 0x9A
    F64_CEIL = 0x9B
    F64_FLOOR = 0x9C
    F64_TRUNC = 0x9D
    F64_NEAREST = 0x9E
    F64_SQRT = 0x9F
    F64_ADD = 0xA0
    F64_SUB = 0xA1
    F64_MUL = 0xA2
    F64_DIV = 0xA3
    F64_MIN = 0xA4
    F64_MAX = 0xA5
    F64_COPYSIGN = 0xA6
    I32_WRAP_I64 = 0xA7
    I32_TRUNC_F32_S = 0xA8
    I32_TRUNC_F32_U = 0xA9
    I32_TRUNC_F64_S = 0xAA
    I32_TRUNC_F64_U = 0xAB
    I64_EXTEND_I32_S = 0xAC
    I64_EXTEND_I32_U = 0xAD
    I64_TRUNC_F32_S = 0xAE
    I64_TRUNC_F32_U = 0xAF
    I64_TRUNC_F64_S = 0xB0
    I64_TRUNC_F64_U = 0xB1
    F32_CONVERT_I32_S = 0xB2
    F32_CONVERT_I32_U = 0xB3
    F32_CONVERT_I64_S = 0xB4
    F32_CONVERT_I64_U = 0xB5
    F32_DEMOTE_F64 = 0xB6
    F64_CONVERT_I32_S = 0xB7
    F64_CONVERT_I32_U = 0xB8
    F64_CONVERT_I64_S = 0xB9
    F64_CONVERT_I64_U = 0xBA
    F64_PROMOTE_F32 = 0xBB
    I32_REINTERPRET_F32 = 0xBC
    I64_REINTERPRET_F64 = 0xBD
    F32_REINTERPRET_I32 = 0xBE
    F64_REINTERPRET_I64 = 0xBF
    I32_EXTEND8_S = 0xC0
    I32_EXTEND16_S = 0xC1
    I64_EXTEND8_S = 0xC2
    I64_EXTEND16_S = 0xC3
    I64_EXTEND32_S = 0xC4
    REF_NULL = 0xD0
    REF_IS_NULL = 0xD1
    REF_FUNC = 0xD2
    I32_TRUNC_SAT_F32_S = 0x00FC
    I32_TRUNC_SAT_F32_U = 0x01FC
    I32_TRUNC_SAT_F64_S = 0x02FC
    I32_TRUNC_SAT_F64_U = 0x03FC
    I64_TRUNC_SAT_F32_S = 0x04FC
    I64_TRUNC_SAT_F32_U = 0x05FC
    I64_TRUNC_SAT_F64_S = 0x06FC
    I64_TRUNC_SAT_F64_U = 0x07FC
    MEMORY_INIT = 0x08FC
    DATA_DROP = 0x09FC
    MEMORY_COPY = 0x0AFC
    MEMORY_FILL = 0x0BFC
    TABLE_INIT = 0x0CFC
    ELEM_DROP = 0x0DFC
    TABLE_COPY = 0x0EFC
    TABLE_GROW = 0x0FFC
    TABLE_SIZE = 0x10FC
    TABLE_FILL = 0x11FC
    V128_LOAD = 0x00FD
    V128_LOAD8X8_S = 0x01FD
    V128_LOAD8X8_U = 0x02FD
    V128_LOAD16X4_S = 0x03FD
    V128_LOAD16X4_U = 0x04FD
    V128_LOAD32X2_S = 0x05FD
    V128_LOAD32X2_U = 0x06FD
    V128_LOAD8_SPLAT = 0x07FD
    V128_LOAD16_SPLAT = 0x08FD
    V128_LOAD32_SPLAT = 0x09FD
    V128_LOAD64_SPLAT = 0x0AFD
    V128_STORE = 0x0BFD
    V128_CONST = 0x0CFD
    I8X16_SHUFFLE = 0x0DFD
    I8X16_SWIZZLE = 0x0EFD
    I8X16_SPLAT = 0x0FFD
    I16X8_SPLAT = 0x10FD
    I32X4_SPLAT = 0x11FD
    I64X2_SPLAT = 0x12FD
    F32X4_SPLAT = 0x13FD
    F64X2_SPLAT = 0x14FD
    I8X16_EXTRACT_LANE_S = 0x15FD
    I8X16_EXTRACT_LANE_U = 0x16FD
    I8X16_REPLACE_LANE = 0x17FD
    I16X8_EXTRACT_LANE_S = 0x18FD
    I16X8_EXTRACT_LANE_U = 0x19FD
    I16X8_REPLACE_LANE = 0x1AFD
    I32X4_EXTRACT_LANE = 0x1BFD
    I32X4_REPLACE_LANE = 0x1CFD
    I64X2_EXTRACT_LANE = 0x1DFD
    I64X2_REPLACE_LANE = 0x1EFD
    F32X4_EXTRACT_LANE = 0x1FFD
    F32X4_REPLACE_LANE = 0x20FD
    F64X2_EXTRACT_LANE = 0x21FD
    F64X2_REPLACE_LANE = 0x22FD
    I8X16_EQ = 0x23FD
    I8X16_NE = 0x24FD
    I8X16_LT_S = 0x25FD
    I8X16_LT_U = 0x26FD
    I8X16_GT_S = 0x27FD
    I8X16_GT_U = 0x28FD
    I8X16_LE_S = 0x29FD
    I8X16_LE_U = 0x2AFD
    I8X16_GE_S = 0x2BFD
    I8X16_GE_U = 0x2CFD
    I16X8_EQ = 0x2DFD
    I16X8_NE = 0x2EFD
    I16X8_LT_S = 0x2FFD
    I16X8_LT_U = 0x30FD
    I16X8_GT_S = 0x31FD
    I16X8_GT_U = 0x32FD
    I16X8_LE_S = 0x33FD
    I16X8_LE_U = 0x34FD
    I16X8_GE_S = 0x35FD
    I16X8_GE_U = 0x36FD
    I32X4_EQ = 0x37FD
    I32X4_NE = 0x38FD
    I32X4_LT_S = 0x39FD
    I32X4_LT_U = 0x3AFD
    I32X4_GT_S = 0x3BFD
    I32X4_GT_U = 0x3CFD
    I32X4_LE_S = 0x3DFD
    I32X4_LE_U = 0x3EFD
    I32X4_GE_S = 0x3FFD
    I32X4_GE_U = 0x40FD
    F32X4_EQ = 0x41FD
    F32X4_NE = 0x42FD
    F32X4_LT = 0x43FD
    F32X4_GT = 0x44FD
    F32X4_LE = 0x45FD
    F32X4_GE = 0x46FD
    F64X2_EQ = 0x47FD
    F64X2_NE = 0x48FD
    F64X2_LT = 0x49FD
    F64X2_GT = 0x4AFD
    F64X2_LE = 0x4BFD
    F64X2_GE = 0x4CFD
    V128_NOT = 0x4DFD
    V128_AND = 0x4EFD
    V128_ANDNOT = 0x4FFD
    V128_OR = 0x50FD
    V128_XOR = 0x51FD
    V128_BITSELECT = 0x52FD
    V128_ANY_TRUE = 0x53FD
    V128_LOAD8_LANE = 0x54FD
    V128_LOAD16_LANE = 0x55FD
    V128_LOAD32_LANE = 0x56FD
    V128_LOAD64_LANE = 0x57FD
    V128_STORE8_LANE = 0x58FD
    V128_STORE16_LANE = 0x59FD
    V128_STORE32_LANE = 0x5AFD
    V128_STORE64_LANE = 0x5BFD
    V128_LOAD32_ZERO = 0x5CFD
    V128_LOAD64_ZERO = 0x5DFD
    F32X4_DEMOTE_F64X2_ZERO = 0x5EFD
    F64X2_PROMOTE_LOW_F32X4 = 0x5FFD
    I8X16_ABS = 0x60FD
    I8X16_NEG = 0x61FD
    I8X16_POPCNT = 0x62FD
    I8X16_ALL_TRUE = 0x63FD
    I8X16_BITMASK = 0x64FD
    I8X16_NARROW_I16X8_S = 0x65FD
    I8X16_NARROW_I16X8_U = 0x66FD
    F32X4_CEIL = 0x67FD
    F32X4_FLOOR = 0x68FD
    F32X4_TRUNC = 0x69FD
    F32X4_NEAREST = 0x6AFD
    I8X16_SHL = 0x6BFD
    I8X16_SHR_S = 0x6CFD
    I8X16_SHR_U = 0x6DFD
    I8X16_ADD = 0x6EFD
    I8X16_ADD_SAT_S = 0x6FFD
    I8X16_ADD_SAT_U = 0x70FD
    I8X16_SUB = 0x71FD
    I8X16_SUB_SAT_S = 0x72FD
    I8X16_SUB_SAT_U = 0x73FD
    F64X2_CEIL = 0x74FD
    F64X2_FLOOR = 0x75FD
    I8X16_MIN_S = 0x76FD
    I8X16_MIN_U = 0x77FD
    I8X16_MAX_S = 0x78FD
    I8X16_MAX_U = 0x79FD
    F64X2_TRUNC = 0x7AFD
    I8X16_AVGR_U = 0x7BFD
    I16X8_EXTADD_PAIRWISE_I8X16_S = 0x7CFD
    I16X8_EXTADD_PAIRWISE_I8X16_U = 0x7DFD
    I32X4_EXTADD_PAIRWISE_I16X8_S = 0x7EFD
    I32X4_EXTADD_PAIRWISE_I16X8_U = 0x7FFD
    I16X8_ABS = 0x80FD
    I16X8_NEG = 0x81FD
    I16X8_Q15MULR_SAT_S = 0x82FD
    I16X8_ALL_TRUE = 0x83FD
    I16X8_BITMASK = 0x84FD
    I16X8_NARROW_I32X4_S = 0x85FD
    I16X8_NARROW_I32X4_U = 0x86FD
    I16X8_EXTEND_LOW_I8X16_S = 0x87FD
    I16X8_EXTEND_HIGH_I8X16_S = 0x88FD
    I16X8_EXTEND_LOW_I8X16_U = 0x89FD
    I16X8_EXTEND_HIGH_I8X16_U = 0x8AFD
    I16X8_SHL = 0x8BFD
    I16X8_SHR_S = 0x8CFD
    I16X8_SHR_U = 0x8DFD
    I16X8_ADD = 0x8EFD
    I16X8_ADD_SAT_S = 0x8FFD
    I16X8_ADD_SAT_U = 0x90FD
    I16X8_SUB = 0x91FD
    I16X8_SUB_SAT_S = 0x92FD
    I16X8_SUB_SAT_U = 0x93FD
    F64X2_NEAREST = 0x94FD
    I16X8_MUL = 0x95FD
    I16X8_MIN_S = 0x96FD
    I16X8_MIN_U = 0x97FD
    I16X8_MAX_S = 0x98FD
    I16X8_MAX_U = 0x99FD
    I16X8_AVGR_U = 0x9BFD
    I16X8_EXTMUL_LOW_I8X16_S = 0x9CFD
    I16X8_EXTMUL_HIGH_I8X16_S = 0x9DFD
    I16X8_EXTMUL_LOW_I8X16_U = 0x9EFD
    I16X8_EXTMUL_HIGH_I8X16_U = 0x9FFD
    I32X4_ABS = 0xA0FD
    I32X4_NEG = 0xA1FD
    I32X4_ALL_TRUE = 0xA3FD
    I32X4_BITMASK = 0xA4FD
    I32X4_EXTEND_LOW_I16X8_S = 0xA7FD
    I32X4_EXTEND_HIGH_I16X8_S = 0xA8FD
    I32X4_EXTEND_LOW_I16X8_U = 0xA9FD
    I32X4_EXTEND_HIGH_I16X8_U = 0xAAFD
    I32X4_SHL = 0xABFD
    I32X4_SHR_S = 0xACFD
    I32X4_SHR_U = 0xADFD
    I32X4_ADD = 0xAEFD
    I32X4_SUB = 0xB1FD
    I32X4_MUL = 0xB5FD
    I32X4_MIN_S = 0xB6FD
    I32X4_MIN_U = 0xB7FD
    I32X4_MAX_S = 0xB8FD
    I32X4_MAX_U = 0xB9FD
    I32X4_DOT_I16X8_S = 0xBAFD
    I32X4_EXTMUL_LOW_I16X8_S = 0xBCFD
    I32X4_EXTMUL_HIGH_I16X8_S = 0xBDFD
    I32X4_EXTMUL_LOW_I16X8_U = 0xBEFD
    I32X4_EXTMUL_HIGH_I16X8_U = 0xBFFD
    I64X2_ABS = 0xC0FD
    I64X2_NEG = 0xC1FD
    I64X2_ALL_TRUE = 0xC3FD
    I64X2_BITMASK = 0xC4FD
    I64X2_EXTEND_LOW_I32X4_S = 0xC7FD
    I64X2_EXTEND_HIGH_I32X4_S = 0xC8FD
    I64X2_EXTEND_LOW_I32X4_U = 0xC9FD
    I64X2_EXTEND_HIGH_I32X4_U = 0xCAFD
    I64X2_SHL = 0xCBFD
    I64X2_SHR_S = 0xCCFD
    I64X2_SHR_U = 0xCDFD
    I64X2_ADD = 0xCEFD
    I64X2_SUB = 0xD1FD
    I64X2_MUL = 0xD5FD
    I64X2_EQ = 0xD6FD
    I64X2_NE = 0xD7FD
    I64X2_LT_S = 0xD8FD
    I64X2_GT_S = 0xD9FD
    I64X2_LE_S = 0xDAFD
    I64X2_GE_S = 0xDBFD
    I64X2_EXTMUL_LOW_I32X4_S = 0xDCFD
    I64X2_EXTMUL_HIGH_I32X4_S = 0xDDFD
    I64X2_EXTMUL_LOW_I32X4_U = 0xDEFD
    I64X2_EXTMUL_HIGH_I32X4_U = 0xDFFD
    F32X4_ABS = 0xE0FD
    F32X4_NEG = 0xE1FD
    F32X4_SQRT = 0xE3FD
    F32X4_ADD = 0xE4FD
    F32X4_SUB = 0xE5FD
    F32X4_MUL = 0xE6FD
    F32X4_DIV = 0xE7FD
    F32X4_MIN = 0xE8FD
    F32X4_MAX = 0xE9FD
    F32X4_PMIN = 0xEAFD
    F32X4_PMAX = 0xEBFD
    F64X2_ABS = 0xECFD
    F64X2_NEG = 0xEDFD
    F64X2_SQRT = 0xEFFD
    F64X2_ADD = 0xF0FD
    F64X2_SUB = 0xF1FD
    F64X2_MUL = 0xF2FD
    F64X2_DIV = 0xF3FD
    F64X2_MIN = 0xF4FD
    F64X2_MAX = 0xF5FD
    F64X2_PMIN = 0xF6FD
    F64X2_PMAX = 0xF7FD
    I32X4_TRUNC_SAT_F32X4_S = 0xF8FD
    I32X4_TRUNC_SAT_F32X4_U = 0xF9FD
    F32X4_CONVERT_I32X4_S = 0xFAFD
    F32X4_CONVERT_I32X4_U = 0xFBFD
    I32X4_TRUNC_SAT_F64X2_S_ZERO = 0xFCFD
    I32X4_TRUNC_SAT_F64X2_U_ZERO = 0xFDFD
    F64X2_CONVERT_LOW_I32X4_S = 0xFEFD
    F64X2_CONVERT_LOW_I32X4_U = 0xFFFD
