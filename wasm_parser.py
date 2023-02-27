
from enum import Enum
from io import SEEK_CUR, BufferedReader
import math
import struct
from types import SimpleNamespace
from instr import INSTRUCTIONS, InstrCode
from wasm_types import BlockKind, CodeBlock, Element, Function, FunctionType, Global, InstrInfo, Memory, ParseMethod, Section, Table, WasmType, WasmModule, Data



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
            elif id == Section.EXPORT:
                self.parse_export_section()
            elif id == Section.START:
                self.parse_start_section()
            elif id == Section.ELEMENT:
                self.parse_element_section()
            elif id == Section.CODE:
                self.parse_code_section()
            # elif id == Section.DATA_COUNT:
            #     self.parse_data_count_section()
            elif id == Section.DATA:
                self.parse_data_section()
            # elif id == Section.CUSTOM:
            #     self.parse_custom_section(size)
            else:
                #raise Exception(f'Unknown section id {id}')
                self.input.seek(size, SEEK_CUR)
            end = self.input.tell()
            if begin + size != end:
                raise Exception(f'Malformed section {id}, {begin} + {size} == { begin + size } != {end}')

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
                self.parse_mem_import(module_name, name)
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

    def parse_table_import(self, module_name, name):
        module = self.module
        reftype = self.read_byte()
        (limit_min, limit_max) = self.parse_limits()
        table = Table(len(module.tables))
        table.type = reftype
        table.min = limit_min
        table.max = limit_max
        table.set_import(module_name, name)
        module.tables.append(table)

    def parse_mem_import(self, module_name, name):
        module = self.module
        (limit_min, limit_max) = self.parse_limits()
        mem = Memory(len(module.memories))
        mem.min = limit_min
        mem.max = limit_max
        mem.set_import(module_name, name)
        module.memories.append(mem)

    def parse_global_import(self, module_name, name):
        module = self.module
        valtype = self.read_byte()
        mutable = self.read_byte()
        glob = Global(len(module.globals))
        glob.type = valtype
        glob.mutable = mutable
        glob.init_function = None
        glob.set_import(module_name, name)
        module.globals.append(glob)

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
            func = self.read_const_func(type)
            glob = Global(len(module.globals))
            glob.type = type
            glob.mutable = mutable
            glob.init_function = func
            module.globals.append(glob)

    def parse_export_section(self):
        module = self.module
        count = self.read_u32()
        for i in range(count):
            name = self.read_string()
            kind = self.read_byte()
            index = self.read_u32()
            if kind == 0:
                module.functions[index].set_export(name)
            elif kind == 1:
                module.tables[index].set_export(name)
            elif kind == 2:
                module.memories[index].set_export(name)
            elif kind == 3:
                module.globals[index].set_export(name)

    def parse_start_section(self):
        module = self.module
        index = self.read_u32()
        module.start_function = module.functions[index]

    def read_const_func(self, type):
        func = Function(None)
        func.type = FunctionType(params=[], results=[type])
        func.locals = []
        func.body = self.parse_code(func)
        return func

    def parse_element_section(self):
        module = self.module
        count = self.read_u32()
        for i in range(count):
            kind = self.read_u32()
            table_index = 0
            offset_func = None
            values = None
            elemkind = 0
            declarative = kind in (3, 7)
            indirect_initializer = kind >= 4
            reftype = WasmType.FUNCREF
            if kind == 0:
                offset_func = self.read_const_func(WasmType.I32)
                items_count = self.read_u32()
                values = [None] * items_count
                for j in range(items_count):
                    index = self.read_u32()
                    values[j] = module.functions[index]
            elif kind in (1, 3):
                elemkind = self.read_byte()
                items_count = self.read_u32()
                values = [None] * items_count
                for j in range(items_count):
                    index = self.read_u32()
                    values[j] = module.functions[index]
            elif kind == 2:
                table_index = self.read_u32()
                offset_func = self.read_const_func(WasmType.I32)
                elemkind = self.read_byte()
                items_count = self.read_u32()
                values = [None] * items_count
                for j in range(items_count):
                    values[j] = module.functions[self.read_u32()]
            elif kind == 4:
                offset_func = self.read_const_func(WasmType.I32)
                items_count = self.read_u32()
                values = [None] * items_count
                for j in range(items_count):
                    values[j] = self.read_const_func(reftype)
            elif kind in (5, 7):
                reftype = self.read_byte()
                items_count = self.read_u32()
                values = [None] * items_count
                for j in range(items_count):
                    values[j] = self.read_const_func(reftype)
            elif kind == 6:
                table_index = self.read_u32()
                offset_func = self.read_const_func(WasmType.I32)
                reftype = self.read_byte()
                items_count = self.read_u32()
                values = [None] * items_count
                for j in range(items_count):
                    values[j] = self.read_const_func(reftype)
            if elemkind != 0:
                raise Exception('Unsupported WASM file format.')
            element = Element()
            element.id = len(module.elements)
            if offset_func is not None:
                element.table = module.tables[table_index]
                element.offset_func = offset_func
            else:
                element.table = None
                element.offset_func = None
            element.values = values
            element.declarative = declarative
            element.indirect_initializer = indirect_initializer
            element.reftype = reftype
            module.elements.append(element)


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
        block = CodeBlock(BlockKind.FUNC, FunctionType(params=[], results=func.type.results), None, None)
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
                block.children.append(instr.block)
                block = instr.block
                block_stack.append(block)
            elif op == InstrCode.ELSE:
                instr = SimpleNamespace(info=info, op=op, if_block=block, br_targets=[block])
                block.body.append(instr)
                block.else_instr = instr
            elif op == InstrCode.END:
                block.body.append(SimpleNamespace(info=info, op=op, ends_block=block, br_targets=[block]))
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
                    instr = SimpleNamespace(info=info, op=op, imm=indexes)
                else:
                    indexes = [self.read_u32()]
                    instr = SimpleNamespace(info=info, op=op, imm=indexes[0])
                instr.br_targets = list()
                for idx in indexes:
                    target = block_stack[-(idx + 1)]
                    target.is_br_target = True
                    instr.br_targets.append(target)
                block.body.append(instr)
            elif op == InstrCode.F32_CONST:
                block.body.append(SimpleNamespace(info=info, op=op, imm=self.read_bytes(4)))
            elif op == InstrCode.F64_CONST:
                block.body.append(SimpleNamespace(info=info, op=op, imm=self.read_bytes(8)))
            elif op == InstrCode.SELECT_T:
                count = self.read_u32()
                vect = []
                for _ in range(count):
                    vect.append(self.read_byte())
                block.body.append(SimpleNamespace(info=info, op=op, imm=vect))
            else:
                raise Exception(f'Unimplemented parsing method of instruction {info.name}.')

    def parse_block_type(self):
        t = self.read_s64()
        if t == -0x40:
            return FunctionType(params=[], results=[])
        elif t < 0:
            return FunctionType(params=[], results=[0x80 + t])
        else:
            return self.module.types[t]

    def parse_data_section(self):
        module = self.module
        count = self.read_u32()
        for i in range(count):
            kind = self.read_byte()
            memory_index = 0
            offset_func = None
            if kind == 2:
                memory_index = self.read_u32()
            if kind != 1:
                offset_func = self.read_const_func(WasmType.I32)
            size = self.read_u32()
            data_buffer = self.read_bytes(size)
            data = Data()
            data.id = len(module.data)
            if offset_func is not None:
                data.memory = module.memories[memory_index]
                data.offset_func = offset_func
            else:
                data.memory = None
                data.offset_func = None
            data.data = data_buffer
            module.data.append(data)

if __name__ == '__main__':
    p = Parser()
    with open('tests/workdir/table_copy.1.wasm', 'rb') as fd:
        p.parse(fd)
