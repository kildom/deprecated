

from enum import Enum, IntEnum
from io import BufferedReader
import struct
from types import SimpleNamespace

from instr import INSTRUCTIONS, ParseMethod

class FunctionType(SimpleNamespace):
    params: 'list[int]'
    results: 'list[int]'


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
        self.if_br_target = False
        self.else_br_target = False
        self.has_else = False
        self.body = []
        self.stack_base = 0

class WasmModule:

    f: BufferedReader

    def __init__(self) -> None:
        self.types = []
        self.functions = []
        self.tables = []
        self.memories = []
        self.globals = []

    def read_byte(self):
        return self.f.read(1)[0]
    
    def read_u32(self):
        return self.read_u64()

    def read_u64(self):
        r = 0
        b = 0x80
        n = 0
        while b & 0x80:
            b = self.f.read(1)[0]
            r |= (b & 0x7F) << n
            n += 7
        return r

    def read_s64(self):
        r = 0
        b = 0x80
        n = 0
        while b & 0x80:
            b = self.f.read(1)[0]
            r |= (b & 0x7F) << n
            n += 7
        if r & (1 << (n - 1)):
            r = r - (1 << n)
        return r

    def read_i32(self):
        return struct.unpack('<I', self.f.read(4))[0]

    def read_i64(self):
        return struct.unpack('<Q', self.f.read(8))[0]

    def read_string(self):
        count = self.read_u32()
        buf = self.f.read(count)
        return buf.decode('utf-8')

    def parse(self, f: BufferedReader):
        self.f = f
        (magic, version) = struct.unpack('<II', f.read(8))
        if magic != 0x6D736100:
            raise Exception('Invalid WebAssembly module.')
        if version != 1:
            raise Exception(f'Unsupported WebAssembly module version {version}.')
        while len(f.peek(1)):
            self.parse_section()

    def parse_section(self):
        id = self.read_byte()
        size = self.read_u32()
        begin = self.f.tell()
        if id == Section.CUSTOM:
            self.parse_custom_section(size)
        elif id == Section.TYPE:
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
        elif id == Section.EXPORT:
            self.parse_export_section()
        elif id == Section.START:
            self.parse_start_section()
        elif id == Section.ELEMENT:
            self.parse_element_section()
        elif id == Section.CODE:
            self.parse_code_section()
        elif id == Section.DATA_COUNT:
            self.parse_data_count_section()
        elif id == Section.DATA:
            self.f.read(size)
        else:
            raise Exception(f'Unknown section id {id}')
        end = self.f.tell()
        if begin + size != end:
            raise Exception(f'Malformed section {id}')

    def parse_custom_section(self, size):
        self.f.read(size)

    def parse_type_section(self):
        count = self.read_u32()
        for i in range(0, count):
            self.types.append(self.parse_functype())

    def parse_import_section(self):
        count = self.read_u32()
        for i in range(0, count):
            module = self.read_string()
            name = self.read_string()
            kind = self.read_byte()
            if kind == 0x00:
                self.parse_func_import(module, name)
            elif kind == 0x01:
                self.parse_table_import(module, name)
            elif kind == 0x02:
                self.parse_mem_import(module, name)
            elif kind == 0x03:
                self.parse_global_import(module, name)
            else:
                raise Exception(f'Unknown import {kind}: {module}.{name}')

    def parse_function_section(self):
        count = self.read_u32()
        for i in range(0, count):
            idx = self.read_u32()
            func = Function(len(self.functions))
            func.type = self.types[idx]
            self.functions.append(func)

    def parse_table_section(self):
        count = self.read_u32()
        for i in range(0, count):
            type = self.read_byte()
            (limit_min, limit_max) = self.parse_limits()
            table = Table(len(self.tables))
            table.type = type
            table.min = limit_min
            table.max = limit_max
            self.tables.append(table)

    def parse_memory_section(self):
        count = self.read_u32()
        for i in range(0, count):
            (limit_min, limit_max) = self.parse_limits()
            mem = Memory(len(self.memories))
            mem.min = limit_min
            mem.max = limit_max
            self.memories.append(mem)

    def parse_global_section(self):
        count = self.read_u32()
        for i in range(0, count):
            type = self.read_byte()
            mutable = self.read_byte() != 0x00
            value = self.parse_const_expr()
            glob = Global(len(self.globals))
            glob.type = type
            glob.mutable = mutable
            glob.value = value
            self.globals.append(glob)

    def parse_const_expr(self):
        # TODO: More complex instructions
        instr = self.read_byte()
        if instr == 0x41:
            value = self.read_u32()
        elif instr == 0x42:
            value = self.read_u64()
        else:
            raise Exception('Not implemented')
        instr = self.read_byte()
        if instr != 0x0B:
            raise Exception('Not implemented')
        return value

    def parse_export_section(self):
        count = self.read_u32()
        for i in range(0, count):
            name = self.read_string()
            kind = self.read_byte()
            idx = self.read_u32()
            if kind == 0x00:
                self.functions[idx].set_export(name)
            elif kind == 0x01:
                self.tables[idx].set_export(name)
            elif kind == 0x02:
                self.memories[idx].set_export(name)
            elif kind == 0x03:
                self.globals[idx].set_export(name)
            else:
                raise Exception('Invalid export kind')

    def parse_element_section(self):
        count = self.read_u32()
        for i in range(0, count):
            def_kind = self.read_u32()
            if def_kind == 0:
                pass
            else:
                raise Exception('Not implemented')
            table = 0
            offset = self.parse_const_expr()
            length = self.read_u32()
            elements = []
            for k in range(0, length):
                elements.append(self.read_u32())
            self.tables[table].init = (offset, elements)

    def parse_data_count_section(self):
        self.read_u32() # just ignore

    def dump_code(self, block):
        code = ''
        for instr in block.body:
            code += f'\n0x{instr.op:X}'
            if (instr.op not in (0x0B, 0x05)) and hasattr(instr, 'block'):
                inner = self.dump_code(instr.block)
                code += inner.replace('\n', '\n\t')
        return code

    def parse_code(self):
        block = CodeBlock(BlockKind.FUNC, ([],[]), None, None) # TODO: Actual function type
        block_stack = [block]

        while True:

            op = self.read_byte()
            if (op == 0xFC) or (op == 0xFD):
                op |= self.read_u32() << 8
            if op not in INSTRUCTIONS:
                print(self.dump_code(block_stack[0]))
                raise Exception(f'Unknown instruction 0x{op:X}')

            info = INSTRUCTIONS[op]
            parse_type = info.parse if hasattr(info, 'parse') else ImmParse.NONE

            if parse_type == ImmParse.NONE:
                block.body.append(SimpleNamespace(info=info, op=op))
            elif parse_type == ImmParse.INDEX:
                block.body.append(SimpleNamespace(info=info, op=op, idx=self.read_u32()))
            elif parse_type == ImmParse.BLOCK:
                type = self.parse_block_type()
                instr = SimpleNamespace(info=info, op=op)
                instr.block = CodeBlock(op, type, block, instr)
                block.body.append(instr)
                block = instr.block
                block_stack.append(block)
            elif parse_type == ImmParse.MEM:
                self.read_u32() # ignore align hint
                block.body.append(SimpleNamespace(info=info, op=op, offset=self.read_u32()))
            elif op == 0x05:
                block.has_else = True
                block.body.append(SimpleNamespace(info=info, op=op, block=block))
            elif op == 0x0B:
                block.body.append(SimpleNamespace(info=info, op=op, block=block))
                if len(block_stack) > 1:
                    block_stack.pop()
                    block = block_stack[-1]
                else:
                    break
            elif op in (0x0C, 0x0D, 0x0E):
                if op == 0x0E:
                    count = self.read_u32()
                    indexes = []
                    for i in range(0, count + 1):
                        indexes.append(self.read_u32())
                    block.body.append(SimpleNamespace(info=info, op=op, indexes=indexes))
                else:
                    indexes = [self.read_u32()]
                    block.body.append(SimpleNamespace(info=info, op=op, idx=indexes[0]))
                for idx in indexes:
                    target = block_stack[-(idx + 1)]
                    if target.has_else:
                        target.else_br_target = True
                    else:
                        target.if_br_target = True
            elif op == 0x41:
                block.body.append(SimpleNamespace(info=info, op=op, value=self.read_u32()))
            elif op == 0x42:
                block.body.append(SimpleNamespace(info=info, op=op, value=self.read_u64()))
            elif op == 0x43:
                value = struct.unpack('<f', self.f.read(4))
                block.body.append(SimpleNamespace(info=info, op=op, value=value))
            elif op == 0x44:
                value = struct.unpack('<d', self.f.read(8))
                block.body.append(SimpleNamespace(info=info, op=op, value=value))
            else:
                raise Exception(f'Unknown instruction 0x{op:X} or parse type {parse_type}')

        return block_stack[0]

    def parse_block_type(self):
        t = self.read_s64()
        if t == -0x40:
            return ([], [])
        elif t < 0:
            return ([], [0x80 + t])
        else:
            return self.types[t]

    def gen_code(self, block: CodeBlock, stack_size: int = 0):
        block.stack_base = stack_size - len(block.type[0])
        output = ''
        for instr in block.body:
            op = instr.op
            info = instr.info
            if hasattr(info, 'code'):
                code = info.code \
                    .replace('s{0}', f's{stack_size}') \
                    .replace('s{-1}', f's{stack_size - 1}') \
                    .replace('s{-2}', f's{stack_size - 2}') \
                    .replace('s{-3}', f's{stack_size - 3}')
                if hasattr(instr, 'idx'):
                    code = code.replace('{idx}', str(instr.idx))
                if hasattr(instr, 'value'):
                    code = code.replace('{value}', str(instr.value))
                if hasattr(instr, 'offset'):
                    code = code.replace('{offset}', str(instr.offset))
                output += code
                stack_size += info.stack
            elif op in (0x02, 0x03):
                output += '\nwhile True:'
                inner = self.gen_code(instr.block, stack_size)
                output += inner.replace('\n', '\n\t')
            elif op == 0x04:
                output += f'\nif s{stack_size - 1}:'
                stack_size -= 1
                inner_block:CodeBlock = instr.block
                if inner_block.if_br_target:
                    output += f'\n\twhile True:'
                    prefix = '\n\t\t'
                else:
                    prefix = '\n\t'
                inner = self.gen_code(instr.block, stack_size)
                output += inner.replace('\n', prefix)
            elif op == 0x0B:
                output += '\nTODO: end'
            elif op == 0x0C:
                output += '\nTODO: branch'
            elif op == 0x0D:
                output += '\nTODO: branch'
            elif op == 0x10:
                func = self.functions[instr.idx]
                type = func.type
                params = ', '.join(f's{stack_size - x - 1}' for x in range(0, len(type.params)))
                stack_size -= len(type.params)
                results = ', '.join(f's{stack_size + x}' for x in range(0, len(type.results)))
                stack_size += len(type.results)
                if len(type.results) == 0:
                    output += f'\nself.f{instr.idx}({params})'
                elif len(type.results) == 1:
                    output += f'\n{results} = self.f{instr.idx}({params})'
                else:
                    output += f'\n({results}) = self.f{instr.idx}({params})'
            else:
                #print(output)
                #raise Exception('Not implemented')
                output += f'\n------EXCEPTION: 0x{op:X}'
                return output
        return output


    def parse_code_section(self):
        count = self.read_u32()
        for i in range(0, count):
            size = self.read_u32()
            if i > 0:
                self.f.read(size)
                continue
            vect_size = self.read_u32()
            locals = []
            for k in range(0, vect_size):
                repeat = self.read_u32()
                type = self.read_byte()
                locals += repeat * [type]
            body = self.parse_code()
            print(self.dump_code(body))
            print(self.gen_code(body).replace('\t', '  '))

    def parse_limits(self):
        kind = self.read_byte()
        if kind == 0x00:
            return (self.read_u32(), None)
        else:
            m = self.read_u32()
            return (m, self.read_u32())

    def parse_func_import(self, module, name):
        idx = self.read_u32()
        func = Function(len(self.functions))
        func.type = self.types[idx]
        func.set_import(module, name)
        self.functions.append(func)

    def parse_functype(self):
        pre = self.read_byte()
        if pre != 0x60:
            raise Exception('Invalid function type')
        param_count = self.read_u32()
        functype = FunctionType()
        functype.params = list(self.f.read(param_count))
        result_count = self.read_u32()
        functype.results = list(self.f.read(result_count))
        return functype

m = WasmModule()
try:
    m.parse(open('test.wasm', 'rb'))
finally:
    #print(m.types)
    #print(m.functions)
    #print(m.tables)
    #print(m.memories)
    #print(m.globals)
    pass

