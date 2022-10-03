

from io import SEEK_CUR, BufferedReader
import math
import struct
from types import SimpleNamespace
from instr import INSTRUCTIONS, InstrCode
from wasm_types import BlockKind, InstrInfo, ParseMethod, Section, WasmType


class FunctionType(SimpleNamespace):
    params: 'list[WasmType]'
    results: 'list[WasmType]'

    def params_count(self):
        return len(self.params)

    def results_count(self):
        return len(self.results)


class ModuleObject(SimpleNamespace):
    def __init__(self, id) -> None:
        self.id = id
        self.imported = False
        self.exported = False

    def set_import(self, module, name):
        self.imported = True
        self.import_module = module
        self.import_name = name

    def set_export(self, name):
        self.exported = True
        self.export_name = name


class Function(ModuleObject):
    def __init__(self, id) -> None:
        super().__init__(id)


class Memory(ModuleObject):
    def __init__(self, id) -> None:
        super().__init__(id)


class Global(ModuleObject):
    def __init__(self, id) -> None:
        super().__init__(id)


class Table(ModuleObject):
    def __init__(self, id) -> None:
        super().__init__(id)


class CodeBlock:
    def __init__(self, kind, type, parent, instr) -> None:
        self.kind = kind
        self.type = type
        self.parent = parent
        self.instr = instr
        self.br_target = False
        self.else_block = None
        self.if_block = None
        self.body = []
        self.stack_base = 0
        self.break_level = 0

class WasmModule(SimpleNamespace):
    types: 'list[FunctionType]'
    functions: 'list[Function]'
    tables: 'list[Table]'
    memories: 'list[Memory]'
    globals: 'list[Global]'
    func_import_count: int

    def __init__(self) -> None:
        self.types = list()
        self.functions = list()
        self.tables = list()
        self.memories = list()
        self.globals = list()
        self.func_import_count = 0


class Parser:

    input: BufferedReader
    module: WasmModule

    def read_byte(self) -> int:
        t = self.input.read(1)
        if len(t) != 1:
            raise Exception('Unexpected end of file.')
        return t[0]

    def read_bytes(self, size:int) -> bytes:
        t = self.input.read(size)
        if len(t) != size:
            raise Exception('Unexpected end of file.')
        return t

    def read_u32(self) -> int:
        return self.read_u64()

    def read_u64(self) -> int:
        r = 0
        b = 0x80
        n = 0
        while b & 0x80:
            t = self.input.read(1)
            if len(t) != 1:
                raise Exception('Unexpected end of file.')
            b = t[0]
            r |= (b & 0x7F) << n
            n += 7
        return r

    def read_s64(self) -> int:
        r = 0
        b = 0x80
        n = 0
        while b & 0x80:
            t = self.input.read(1)
            if len(t) != 1:
                raise Exception('Unexpected end of file.')
            b = t[0]
            r |= (b & 0x7F) << n
            n += 7
        if r & (1 << (n - 1)):
            r = r - (1 << n)
        return r

    def read_i32(self) -> int:
        t = self.input.read(4)
        if len(t) != 4:
            raise Exception('Unexpected end of file.')
        return struct.unpack('<I', t)[0]

    def read_i64(self) -> int:
        t = self.input.read(8)
        if len(t) != 8:
            raise Exception('Unexpected end of file.')
        return struct.unpack('<Q', t)[0]

    def read_string(self) -> str:
        count = self.read_u32()
        buf = self.input.read(count)
        return buf.decode('utf-8')

    def parse(self, input: BufferedReader) -> WasmModule:
        self.input = input
        self.module = WasmModule()
        self.parse_header()
        self.parse_sections()
        # TODO: catch known io errors, e.g. unexpected end of file
        return self.module

    def parse_header(self):
        magic = self.read_i32()
        if magic != 0x6D736100:
            raise Exception('Invalid WebAssembly module.')
        version = self.read_i32()
        if version != 1:
            raise Exception(f'Unsupported WebAssembly module version {version}.')

    def parse_sections(self):
        while True:
            t = self.input.read(1)
            if len(t) != 1:
                break
            id = t[0]
            size = self.read_u32()
            begin = self.input.tell()
            if id == Section.TYPE:
                self.parse_type_section()
            elif id == Section.IMPORT:
                self.parse_import_section()
            elif id == Section.FUNCTION:
                self.parse_function_section()
            elif id == Section.TABLE:
                self.parse_table_section()
            elif id == Section.MEMORY:
                self.parse_memory_section()
            elif id == Section.GLOBAL:
                self.parse_global_section()
            # elif id == Section.EXPORT:
            #     self.parse_export_section()
            # elif id == Section.START:
            #     self.parse_start_section()
            # elif id == Section.ELEMENT:
            #     self.parse_element_section()
            elif id == Section.CODE:
                self.parse_code_section()
            # elif id == Section.DATA_COUNT:
            #     self.parse_data_count_section()
            # elif id == Section.DATA:
            #     self.input.read(size)
            # elif id == Section.CUSTOM:
            #     self.parse_custom_section(size)
            else:
                #raise Exception(f'Unknown section id {id}')
                self.input.seek(size, SEEK_CUR)
            end = self.input.tell()
            if begin + size != end:
                raise Exception(f'Malformed section {id}')

    def parse_type_section(self):
        count = self.read_u32()
        for i in range(count):
            pre = self.read_byte()
            if pre != 0x60:
                raise Exception('Invalid function type')
            param_count = self.read_u32()
            functype = FunctionType()
            functype.params = list(self.read_bytes(param_count))
            result_count = self.read_u32()
            functype.results = list(self.read_bytes(result_count))
            self.module.types.append(functype)

    def parse_import_section(self):
        count = self.read_u32()
        for i in range(count):
            module_name = self.read_string()
            name = self.read_string()
            kind = self.read_byte()
            if kind == 0x00:
                self.parse_func_import(module_name, name)
            elif kind == 0x01:
                self.parse_table_import(module_name, name) # TODO: implement
            elif kind == 0x02:
                self.parse_mem_import(module_name, name) # TODO: implement
            elif kind == 0x03:
                self.parse_global_import(module_name, name) # TODO: implement
            else:
                raise Exception(f'Unknown import {kind}: {module_name}.{name}')

    def parse_func_import(self, module_name, name):
        module = self.module
        idx = self.read_u32()
        func = Function(len(module.functions))
        func.type = module.types[idx]
        func.set_import(module_name, name)
        module.functions.append(func)

    def parse_function_section(self):
        module = self.module
        module.func_import_count = len(module.functions)
        count = self.read_u32()
        for i in range(count):
            idx = self.read_u32()
            func = Function(len(module.functions))
            func.type = module.types[idx]
            module.functions.append(func)

    def parse_table_section(self):
        module = self.module
        count = self.read_u32()
        for i in range(count):
            type = self.read_byte()
            (limit_min, limit_max) = self.parse_limits()
            table = Table(len(module.tables))
            table.type = type
            table.min = limit_min
            table.max = limit_max
            module.tables.append(table)

    def parse_memory_section(self):
        module = self.module
        count = self.read_u32()
        for i in range(count):
            (limit_min, limit_max) = self.parse_limits()
            mem = Memory(len(module.memories))
            mem.min = limit_min
            mem.max = limit_max
            module.memories.append(mem)

    def parse_limits(self):
        kind = self.read_byte()
        if kind == 0x00:
            return (self.read_u32(), None)
        else:
            m = self.read_u32()
            return (m, self.read_u32())

    def parse_global_section(self):
        module = self.module
        count = self.read_u32()
        for i in range(count):
            type = self.read_byte()
            mutable = self.read_byte() != 0x00
            func = Function(None)
            func.type = FunctionType(params=[], results=[type])
            func.locals = [] # TODO: to constructor
            func.body = self.parse_code(func)
            glob = Global(len(module.globals))
            glob.type = type
            glob.mutable = mutable
            glob.init_function = func
            module.globals.append(glob)

    def parse_code_section(self):
        module = self.module
        count = self.read_u32()
        for i in range(count):
            func = module.functions[module.func_import_count + i]
            size = self.read_u32()
            vect_size = self.read_u32()
            locals = []
            for k in range(vect_size):
                repeat = self.read_u32()
                type = self.read_byte()
                locals += repeat * [type]
            func.locals = locals
            func.body = self.parse_code(func)

    def parse_code(self, func):
        block = CodeBlock(BlockKind.FUNC, func.type, None, None)
        block_stack = [block]
        while True:
            op = self.read_byte()
            if (op == 0xFC) or (op == 0xFD):
                op |= self.read_u32() << 8
            if op not in INSTRUCTIONS:
                raise Exception(f'Unknown instruction 0x{op:X}')
            info = INSTRUCTIONS[op]
            if info.parse == ParseMethod.NONE:
                block.body.append(SimpleNamespace(info=info, op=op))
            elif info.parse == ParseMethod.BYTE:
                block.body.append(SimpleNamespace(info=info, op=op, imm=self.read_byte()))
            elif info.parse == ParseMethod.U64:
                block.body.append(SimpleNamespace(info=info, op=op, imm=self.read_u64()))
            elif info.parse == ParseMethod.U64U64:
                first = self.read_u64()
                block.body.append(SimpleNamespace(info=info, op=op, imm=(first, self.read_u64())))
            elif info.parse == ParseMethod.MEM:
                self.read_u32() # ignore align hint
                block.body.append(SimpleNamespace(info=info, op=op, imm=self.read_u32()))
            elif info.parse == ParseMethod.BLOCK:
                type = self.parse_block_type()
                instr = SimpleNamespace(info=info, op=op)
                instr.block = CodeBlock(op, type, block, instr)
                block.body.append(instr)
                block = instr.block
                block_stack.append(block)
            elif op == InstrCode.ELSE:
                block.body.append(SimpleNamespace(info=INSTRUCTIONS[InstrCode.END], op=InstrCode.END, block=block))
                if_block = block
                block_stack.pop()
                block = block_stack[-1]
                instr = SimpleNamespace(info=info, op=op)
                instr.block = CodeBlock(op, if_block.type, block, instr)
                instr.block.if_block = if_block
                if_block.else_block = instr.block
                block.body.append(instr)
                block = instr.block
                block_stack.append(block)
            elif op == InstrCode.END:
                block.body.append(SimpleNamespace(info=info, op=op, block=block))
                if len(block_stack) > 1:
                    block_stack.pop()
                    block = block_stack[-1]
                else:
                    return block_stack[0]
            elif op in (InstrCode.BR, InstrCode.BR_IF, InstrCode.BR_TABLE):
                if op == InstrCode.BR_TABLE:
                    count = self.read_u32()
                    indexes = []
                    for i in range(0, count + 1):
                        indexes.append(self.read_u32())
                    block.body.append(SimpleNamespace(info=info, op=op, imm=indexes))
                else:
                    indexes = [self.read_u32()]
                    block.body.append(SimpleNamespace(info=info, op=op, imm=indexes[0]))
                for idx in indexes:
                    target = block_stack[-(idx + 1)]
                    target.br_target = True
            elif op == InstrCode.F32_CONST:
                block.body.append(SimpleNamespace(info=info, op=op, imm=self.read_bytes(4)))
            elif op == InstrCode.F64_CONST:
                block.body.append(SimpleNamespace(info=info, op=op, imm=self.read_bytes(8)))
            else:
                raise Exception(f'Unimplemented parsing method of instruction {info.name}.')

    def parse_block_type(self):
        t = self.read_s64()
        if t == -0x40:
            return FunctionType(params=[], results=[])
        elif t < 0:
            return FunctionType(params=[], results=[0x80 + t])
        else:
            return self.types[t]

class PyGenerator:
    def __init__(self) -> None:
        pass

    def generate(self, module: WasmModule):
        self.module = module
        self.output = []
        self.output.append('class MyModule:')
        for func in module.functions:
            if func.imported:
                self.generate_imported_function(func)
            else:
                self.generate_function(func)
        return '\n'.join(self.output)

    def generate_imported_function(self, func:Function):
        self.output.append('')
        self.output.append(f'\tdef _f{func.id}(*args):')
        self.output.append(f'\t\treturn self.imports.{func.import_module}.{func.import_name}(*args)')

    def generate_function(self, func:Function):
        params_count = func.type.params_count()
        args = ', '.join(f'l{x}' for x in range(params_count))
        self.output.append('')
        self.output.append(f'\tdef _f{func.id}({args}):')
        i = 0
        for type in func.locals: #TODO: Is it really needed?
            if type in (WasmType.FUNCREF, WasmType.EXTERNREF):
                self.output.append(f'\t\tl{params_count + i} = None')
            elif type in (WasmType.F32, WasmType.F64):
                self.output.append(f'\t\tl{params_count + i} = 0.0')
            elif type == WasmType.V128:
                self.output.append(f'\t\tl{params_count + i} = bytearray(self._empty_v128_array)')
                self.using('empty_v128_array')
            else:
                self.output.append(f'\t\tl{params_count + i} = 0')
            i += 1
        self.generate_block_body(func, func.body, '\t\t', 0, 0)

    def generate_block_body(self, func:Function, block:CodeBlock, ind, initial_stack_size, break_level):
        block.break_level = break_level
        block.stack_base = initial_stack_size - block.type.params_count()
        module = self.module
        stack_size = initial_stack_size
        for instr in block.body:
            info:InstrInfo = instr.info
            if info.code is not None:
                code = instr.info.code
                if hasattr(instr, 'imm'):
                    if hasattr(instr.imm, '__iter__'):
                        i = 0
                        for val in instr.imm:
                            code = code.replace(f'{{imm{i}}}', str(val))
                            i += 1
                    else:
                        code = code.replace('{imm}', str(instr.imm))
                code = code.replace('{0}', f's{stack_size}')
                code = code.replace('{-1}', f's{stack_size - 1}')
                code = code.replace('{-2}', f's{stack_size - 2}')
                code = code.replace('{-3}', f's{stack_size - 3}')
                code = code.replace('\n', f'\n{ind}')
                self.output.append(f'{ind}{code}')
                stack_size += info.stack
            elif info.opcode in (InstrCode.BLOCK, InstrCode.LOOP):
                self.output.append(f'{ind}while True:')
                self.generate_block_body(func, instr.block, ind + '\t', stack_size, break_level + 1)
                stack_size -= instr.block.type.params_count()
                stack_size += instr.block.type.results_count()
            elif info.opcode == InstrCode.IF:
                block = instr.block
                self.output.append(f'{ind}if s{stack_size - 1}:')
                next_ind = ind + '\t'
                next_break_level = break_level
                if block.br_target:
                    self.output.append(f'{ind}while True:')
                    next_ind = ind + '\t\t'
                    next_break_level = break_level + 1
                stack_size -= 1
                self.generate_block_body(func, instr.block, next_ind, stack_size, next_break_level)
                if instr.block.else_block is None:
                    stack_size -= instr.block.type.params_count()
                    stack_size += instr.block.type.results_count()
            elif info.opcode == InstrCode.ELSE:
                block = instr.block
                self.output.append(f'{ind}else:')
                next_ind = ind + '\t'
                next_break_level = break_level
                if block.br_target:
                    self.output.append(f'{ind}while True:')
                    next_ind = ind + '\t\t'
                    next_break_level = break_level + 1
                self.generate_block_body(func, instr.block, next_ind, stack_size, next_break_level)
                stack_size -= instr.block.type.params_count()
                stack_size += instr.block.type.results_count()
            elif info.opcode == InstrCode.BR_IF:
                self.output.append(f'{ind}if s{stack_size - 1}:')
                stack_size -= 1
                self.generate_break(func, block, ind + '\t', stack_size, instr.imm)
            elif info.opcode == InstrCode.BR:
                self.generate_break(func, block, ind, stack_size, instr.imm)
                break
            elif info.opcode == InstrCode.BR_TABLE:
                stack_size -= 1
                self.output.append(f'{ind}if s{stack_size} == 0:')
                self.generate_break(func, block, ind + '\t', stack_size, instr.imm[0])
                i = 1
                for imm in instr.imm[1:-1]:
                    self.output.append(f'{ind}elif s{stack_size} == {i}:')
                    self.generate_break(func, block, ind + '\t', stack_size, imm)
                    i += 1
                self.output.append(f'{ind}else:')
                self.generate_break(func, block, ind + '\t', stack_size, instr.imm[-1])
                break
            elif info.opcode == InstrCode.END:
                if (block.kind not in (BlockKind.IF, BlockKind.ELSE)) or block.br_target:
                    self.generate_break(func, block, ind, stack_size, 0, True)
                break
            elif info.opcode == InstrCode.RETURN:
                self.generate_break(func, block, ind, stack_size, None)
                break
            elif info.opcode == InstrCode.GLOBAL_GET:
                self.output.append(f'{ind}s{stack_size} = self._g{instr.imm}') #TODO: exported and imported globals
                stack_size += 1
            elif info.opcode == InstrCode.GLOBAL_SET:
                self.output.append(f'{ind}self._g{instr.imm} = s{stack_size - 1}') #TODO: exported and imported globals
                stack_size -= 1
            elif info.opcode in (InstrCode.CALL, InstrCode.CALL_INDIRECT):
                if info.opcode == InstrCode.CALL:
                    type = module.functions[instr.imm].type
                    func_name = f'self._f{instr.imm}'
                else:
                    type = module.types[instr.imm[0]]
                    self.output.append(f'{ind}t = self._t{instr.imm[1]}[s{stack_size - 1}]') # TODO: imported tables
                    stack_size -= 1
                    func_name = 't'
                params = ', '.join(f's{stack_size - x - 1}' for x in range(0, len(type.params)))
                stack_size -= len(type.params)
                results = ', '.join(f's{stack_size + x}' for x in range(0, len(type.results)))
                stack_size += len(type.results)
                if len(type.results) == 0:
                    self.output.append(f'{ind}{func_name}({params})')
                else:
                    self.output.append(f'{ind}{results} = {func_name}({params})')
            elif info.opcode in (InstrCode.F32_CONST, InstrCode.F64_CONST):
                value = struct.unpack('<f' if info.opcode == InstrCode.F32_CONST else '<d', instr.imm)[0]
                if math.isnan(value):
                    value = 'nan'
                elif math.isinf(value):
                    value = 'inf' if value > 0 else '-inf'
                else:
                    value = str(value)
                self.output.append(f'{ind}s{stack_size} = {value}')
                stack_size += 1
            else:
                print(info)
                #exit()

    def generate_break(self, func:Function, block:CodeBlock, ind, stack_size, imm, force_forward = False):
        if imm is not None:
            target = block
            for i in range(imm):
                target = target.parent
        else:
            target = func.body
        break_count = block.break_level - target.break_level + 1
        if target.kind == BlockKind.FUNC:
            if func.type.results_count() == 0:
                self.output.append(f'{ind}return')
            elif func.type.results_count() == 1:
                self.output.append(f'{ind}return s{stack_size - 1}')
            else:
                results = ', '.join(f's{stack_size + x}' for x in range(-func.type.results_count(), 0))
                self.output.append(f'{ind}return ({results})')
        elif (target.kind == BlockKind.LOOP) and not force_forward:
            if break_count == 1:
                self.output.append(f'{ind}continue')
            else:
                self.output.append(f'{ind}continue')
        else:
            new_stack_size = target.stack_base + target.type.results_count()
            unwind = stack_size - new_stack_size
            if (unwind > 0) and (target.type.results_count() > 0):
                src = ', '.join(f's{stack_size + x}' for x in range(-target.type.results_count(), 0))
                dst = ', '.join(f's{new_stack_size + x}' for x in range(-target.type.results_count(), 0))
                self.output.append(f'{ind}{dst} = {src}')
            if break_count == 1:
                self.output.append(f'{ind}break')
            else:
                self.output.append(f'{ind}break')



    def using(self, feature):
        pass


m = Parser()
try:
    mod = m.parse(open('test.wasm', 'rb'))
    g = PyGenerator()
    print(g.generate(mod))
    #print(mod)
finally:
    pass

