
from enum import Enum
from io import SEEK_CUR, BufferedReader
import json
import io
import math
from pathlib import Path
import re
import struct
import textwrap
import base64
from types import SimpleNamespace
from instr import INSTRUCTIONS, InstrCode
from json_exporter import JsonExporter
from wasm_builtins import BUILTIN_LOCATION_CLASS, BUILTIN_LOCATION_GLOBAL, Builtins
from wasm_parser import Parser
from wasm_types import BlockKind, CodeBlock, Function, FunctionType, Global, InstrInfo, Memory, ModuleObject, ParseMethod, Section, Table, WasmType, WasmModule, wasm_type_str



PY_MAX_LEVELS = 11 # TODO: check this value


def default_value_for_type(t: WasmType):
    if t in (WasmType.EXTERNREF, WasmType.FUNCREF):
        return 'None'
    elif t in (WasmType.F32, WasmType.F64):
        return '0.0'
    else:
        return '0'

class PyNameGenerator():

    PYTHON_KEYWORDS = (
        'False|await|else|import|pass|None|break|except|in|raise|True|class|'
        'finally|is|return|and|continue|for|lambda|try|as|def|from|nonlocal|'
        'while|assert|del|global|not|with|async|elif|if|or|yield'
    )

    def __init__(self, forbidden=''):
        if len(forbidden):
            forbidden += '|'
        self.py2wasm = {}
        self.wasm2py = {}
        self.sub_re = re.compile(r'^$|[^A-Za-z0-9_]+')
        self.match_re = re.compile(f'{forbidden}{PyNameGenerator.PYTHON_KEYWORDS}|_W_.+|__[^_].*|[0-9].*')
    
    def name_alt_generator(self, name):
        yield name
        index = 0
        while True:
            index += 1
            yield name + '_' + str(index)

    def get_name(self, wasm):
        py = self.sub_re.sub('_', wasm)
        while self.match_re.match(py) is not None:
            py = '_' + py
        for py in self.name_alt_generator(py):
            if py not in self.py2wasm:
                self.py2wasm[py] = wasm
                self.wasm2py[wasm] = py
                break
            elif self.py2wasm[py] == wasm:
                break
        return py


class Generator:

    def __init__(self):
        self.module = None
        self.chunks_output = []

    def generate(self, module: WasmModule):

        self.module = module
        self.output = []
        self.output_stack = []
        self.class_name = 'WasmModuleClass'
        self.indent = '\t'
        self.add_comments = True

        for func in module.functions:
            self.generate_func(func)

        return '\n'.join(self.output)

        class_ng = PyNameGenerator('imports|control')
        import_ng = PyNameGenerator()
        import_module_ng: 'dict[str, PyNameGenerator]' = {}
        for obj in module.functions + module.memories + module.globals + module.tables:
            obj: 'ModuleObject'
            if obj.imported:
                module_py = import_ng.get_name(obj.import_module)
                if module_py not in import_module_ng:
                    import_module_ng[module_py] = PyNameGenerator()
                obj.name = import_module_ng[module_py].get_name(obj.import_name)
                obj.full_name = f'imports.{module_py}.{obj.name}'
            elif obj.exported: # Known limitation: symbol cannot be imported and exported at the same time
                obj.name = class_ng.get_name(obj.export_name)
                obj.full_name = obj.name


        special_functions = []

        self.push_output()
        for glob in self.module.globals:
            if not glob.imported:
                self.write(2, f'self.{glob.full_name} = self.{glob.init_function.full_name}()')
                special_functions.append(glob.init_function)
        for data in self.module.data:
            vector = base64.b64encode(data.data).decode('ascii')
            vector = [vector[i:i+120] for i in range(0, len(vector), 120)]
            vector = '\n'.join(vector)
            self.write(2, f'self._W_dat{data.id} = b64decode(b"""')
            self.write(3, vector + '""")')
            if data.memory is not None:
                memory = data.memory
                special_functions.append(data.offset_func)
                self.write(2, textwrap.dedent(f'''
                    offset = self.{data.offset_func.full_name}()
                    self._W_check_memory_size(self.{memory.full_name}, offset + {len(data.data)}, {memory.max})
                    self.{memory.full_name}[offset:offset + {len(data.data)}] = self._W_dat{data.id}''').strip())
                module.requested_builtins.add('_W_check_memory_size')
                module.requested_builtins.add('_W_memory_grow')
            module.requested_builtins.add('b64decode')
        for element in self.module.elements:
            if not element.declarative:
                count = len(element.values)
                if element.indirect_initializer:
                    for func in element.values:
                        special_functions.append(func)
                    postfix = '()'
                else:
                    postfix = ''
                vector = ', '.join(f'self.{func.full_name}{postfix}' for func in element.values)
                vector = '\n'.join(textwrap.wrap(vector, width=120))
                self.write(2, f'self._W_el{element.id} = [')
                self.write(3, vector + ']')
                if element.table is not None:
                    table = element.table
                    special_functions.append(element.offset_func)
                    self.write(2, textwrap.dedent(f'''
                        offset = self.{element.offset_func.full_name}()
                        self._W_check_table_size(self.{table.full_name}, offset + {count}, {table.max})
                        self.{table.full_name}[offset:offset + {count}] = self._W_el{element.id}''').strip())
                    module.requested_builtins.add('_W_check_table_size')
                    module.requested_builtins.add('_W_table_grow')

        code_init = self.pop_output()

        # Generate functions
        self.push_output()
        for func in module.functions:
            if not func.imported:
                self.generate_func(func)
        for func in special_functions:
            self.generate_func(func)
        code_functions = self.pop_output()

        self.push_output()
        self.write(0, f'class {self.class_name}:')
        self.write(1, 'control = Control')
        self.write(1, 'def __init__(self, **mods):')
        self.write(2, 'self.imports = SimpleNamespace(**mods)') # TODO: generate code that checks if no imports is missing and memory/table sizes are >= min size
        self.write(2, 'self.control = Control(self)')

        for mem in self.module.memories:
            if not mem.imported:
                self.write(2, f'self.{mem.full_name} = bytearray({mem.min} * 0x10000)')
                self.write(2, f'self._W_m_lim{mem.id} = ({mem.min}, {mem.max})')
        for table in self.module.tables:
            if not table.imported:
                self.write(2, f'self.{table.full_name} = [{default_value_for_type(table.type)}] * {table.min}')
                self.write(2, f'self._W_t_lim{table.id} = ({table.min}, {table.max})')
        self.write(0, code_init)
        self.write(1, 'def __call__(self):')
        if module.start_function is not None:
            self.write(2, f'return self.{module.start_function.full_name}()')
        else:
            self.write(2, 'pass')
        code_class = self.pop_output()

        code_globals = []
        code_imports = []

        modules = dict()
        module.requested_builtins.add('SimpleNamespace')
        for builtin in module.requested_builtins:
            location, name, code = Builtins.get(builtin)
            if location == BUILTIN_LOCATION_GLOBAL:
                self.write(0, code, output=code_globals)
            elif location == BUILTIN_LOCATION_CLASS:
                self.write(1, code, output=code_class)
            else:
                if location not in modules:
                    modules[location] = []
                modules[location].append(name)
        for mod, symbols in modules.items():
            self.write(0, f'from {mod} import {", ".join(symbols)}', output=code_imports)

        self.push_output()

        with open(Path(__file__).parent / 'control.py', 'r') as fd:
            self.write(0, fd.read().strip())

        self.write(0, '')
        self.write(1, 'export_wasm2py = {')
        for wasm, py in class_ng.wasm2py.items():
            if wasm != py:
                self.write(2, f'{repr(wasm)}: {repr(py)},')
        self.write(1, '}')
        self.write(1, 'module_wasm2py = {')
        for wasm, py in import_ng.wasm2py.items():
            if wasm != py:
                self.write(2, f'{repr(wasm)}: {repr(py)},')
        self.write(1, '}')
        self.write(1, 'import_wasm2py = {')
        for mod_name, value in import_module_ng.items():
            self.push_output()
            for wasm, py in value.wasm2py.items():
                if wasm != py:
                    self.write(3, f'{repr(wasm)}: {repr(py)},')
            content = self.pop_output()
            if len(content) > 0:
                self.write(2, f'{repr(mod_name)}: {{')
                self.write(0, content)
                self.write(2, '},')
        self.write(1, '}')

        control = self.pop_output()

        self.write(0, code_imports)
        self.write(0, '')
        self.write(0, control)
        self.write(0, '')
        self.write(0, code_globals)
        self.write(0, '')
        self.write(0, code_class)
        self.write(0, code_functions)
        # finally:
        #     with open('out.py', 'w') as fd:
        #         fd.write('\n'.join(self.output))
        #     with open('a.json', 'w') as fd:
        #         json.dump(self.module, fd, indent=4, cls=JsonExporter)
        return '\n'.join(self.output)


    def write(self, ind: int, text: 'str|list[str]', comment: 'str|None' = None, output = None):
        output = output if output is not None else self.output
        if isinstance(text, str):
            text = text.replace('\r', '').split('\n')
        for line in text:
            local_ind = ind
            while line.startswith('\t'):
                local_ind += 1
                line = line[1:]
            while line.startswith('    '):
                local_ind += 1
                line = line[4:]
            line = self.indent * local_ind + line
            if self.add_comments and comment:
                line += '          # ' + comment
                comment = '^^^^'
            output.append(line)

    def push_output(self, output=None):
        self.output_stack.append(self.output)
        self.output = output if output is not None else []

    def pop_output(self):
        result = self.output
        self.output = self.output_stack.pop()
        return result

    def generate_func(self, func: Function):

        self.write(1, f'def {func.name}:')

        return

        # Divide function body into chunks to avoid Python nesting limitation.
        chunks = self.divide_to_chunks(func)

        # Generate body of the function and gather information about its contents.
        self.chunks_output = []
        self.push_output()
        self.generate_block(2, 0, func, func.body, func.body)
        body_output = self.pop_output()

        # Generate function header.
        params_names = list(f'l{i}' for i in range(len(func.type.params)))
        if len(params_names):
            params_str = ', ' + ', '.join(params_names)
        else:
            params_str = ''
        self.write(1, f'def {func.name}(self{params_str}):')

        # Copy reference memory to local variables
        for mem in self.module.memories:
            self.write(2, f'mem{mem.id} = self.{mem.full_name}')

        # Generate dummy stack variable assignment for correct nonlocal bindings
        if func.max_shared_stack > 0:
            self.write(2, f'if False: {", ".join(f"s{i}" for i in range(func.max_shared_stack))} = None')

        # Generate local variables initialization
        for index, local_type in enumerate(func.locals):
            real_index = len(func.type.params) + index
            self.write(2, f'l{real_index} = {default_value_for_type(local_type)}')

        # Put previously generated body into the function
        self.write(0, self.chunks_output)
        self.write(0, body_output)

    def generate_block(self, ind: int, stack_size: int, func: Function, block: CodeBlock, chunk: CodeBlock):
        info_str = f'B{block.id} @{block.level} {wasm_type_str(block.type.params)} -> {wasm_type_str(block.type.results)}'
        if block.kind == BlockKind.BLOCK:
            self.write(ind, 'while True:',  f'BLOCK {info_str}')
            block.stack_base = stack_size - len(block.type.params)
            self.generate_body(ind + 1, func, block, chunk)
        elif block.kind == BlockKind.LOOP:
            self.write(ind, 'while True:',  f'LOOP {info_str}')
            block.stack_base = stack_size - len(block.type.params)
            self.generate_body(ind + 1, func, block, chunk)
        elif block.kind == BlockKind.IF:
            self.write(ind, f'while s{stack_size - 1} != 0:',  f'IF {info_str}')
            block.stack_base = stack_size - len(block.type.params) - 1
            self.generate_body(ind + 1, func, block, chunk)
            if block.else_instr is None:
                self.write(ind, 'else:')
                self.write(ind + 1, f'bt = {block.level}')
        elif block.kind == BlockKind.FUNC:
            self.write(ind, 'while True:',  f'FUNCTION {info_str}')
            block.stack_base = stack_size
            self.generate_body(ind + 1, func, block, chunk)
            if len(func.type.results) == 1:
                self.write(ind, f'return s{stack_size}')
            elif len(func.type.results) > 1:
                vars = ', '.join(f's{x + stack_size}' for x in range(len(func.type.results))) # TODO: check order of results
                self.write(ind, f'return ({vars})')

    def generate_body(self, ind: int, func: Function, block: CodeBlock, chunk: CodeBlock):
        stack_size = block.stack_base + len(block.type.params)
        unreachable = False
        counter = 0
        for instr in block.body :
            counter += 1
            if instr.op == InstrCode.ELSE:
                if counter == 1:
                    self.write(ind, 'pass')
                self.write(ind - 1, 'else:')
                self.write(ind, f'bt = {block.level + 1}')
                self.write(ind - 1, f'while bt == {block.level + 1}:')
                stack_size = block.stack_base + len(block.type.params)
                unreachable = False
            elif unreachable:
                self.write(ind, '', f'unreachable {instr.info.name}')
                counter -= 1
            elif (instr.op == InstrCode.BLOCK) or (instr.op == InstrCode.LOOP) or (instr.op == InstrCode.IF):
                # Generate block body
                if instr.block.chunk_start:
                    self.generate_chunk(stack_size, func, instr.block)
                    self.write(ind, f'ch{instr.block.chunk_id}()')
                    chunk.max_shared_stack = max(chunk.max_shared_stack, instr.block.max_shared_stack)
                else:
                    self.generate_block(ind, stack_size, func, instr.block, chunk)
                # Calculate new stack size
                if instr.block.kind == BlockKind.IF:
                    stack_size -= 1
                stack_size -= len(instr.block.type.params)
                stack_size += len(instr.block.type.results)
                # Add break chaining statements
                if block.kind == BlockKind.LOOP:
                    self.write(ind, f'if bt < {instr.block.level}:')
                    self.write(ind + 1, f'if bt == {block.level}: continue')
                    self.write(ind + 1, f'break')
                else:
                    self.write(ind, f'if bt < {instr.block.level}: break')
            elif instr.op == InstrCode.END:
                self.generate_branch(ind, stack_size, block, 0, True, instr.info.name, chunk)
                unreachable = True
            elif instr.op == InstrCode.BR:
                self.generate_branch(ind, stack_size, block, instr.imm, False, instr.info.name, chunk)
                unreachable = True
            elif instr.op == InstrCode.BR_TABLE:
                stack_size -= 1
                if len(instr.imm) > 1:
                    for i in range(len(instr.imm) - 1):
                        self.write(ind, f'if s{stack_size} == {i}:')
                        self.generate_branch(ind + 1, stack_size, block, instr.imm[i], False, instr.info.name, chunk)
                    self.write(ind, f'else:')
                    def_ind = 1
                else:
                    def_ind = 0
                self.generate_branch(ind + def_ind, stack_size, block, instr.imm[-1], False, instr.info.name, chunk)
                unreachable = True
            elif instr.op == InstrCode.BR_IF:
                stack_size -= 1
                self.write(ind, f'if s{stack_size} != 0:')
                self.generate_branch(ind + 1, stack_size, block, instr.imm, False, instr.info.name, chunk)
            elif instr.op == InstrCode.RETURN:
                self.generate_branch(ind, stack_size, block, block.level, False, instr.info.name, chunk)
                unreachable = True
            elif instr.op == InstrCode.UNREACHABLE:
                self.write(ind, 'self._W_unreachable()', 'unreachable')
                unreachable = True
                self.module.requested_builtins.add('_W_unreachable')
            elif instr.op == InstrCode.CALL:
                dest = self.module.functions[instr.imm]
                stack_size = self.generate_call(ind, stack_size, f'self.{dest.full_name}', dest.type, f'CALL {dest.full_name}')
            elif instr.op == InstrCode.CALL_INDIRECT:
                type_index, table_index = instr.imm
                table = self.module.tables[table_index]
                stack_size -= 1
                stack_size = self.generate_call(ind, stack_size, f'self.{table.full_name}[s{stack_size}]', self.module.types[type_index], f'CALL_INDIRECT from table {table_index}')
            elif instr.op == InstrCode.LOCAL_SET:
                stack_size -= 1
                self.write(ind, f'l{instr.imm} = s{stack_size}')
                chunk.nonlocals.add(f'l{instr.imm}')
            elif instr.op == InstrCode.LOCAL_TEE:
                self.write(ind, f'l{instr.imm} = s{stack_size - 1}')
                chunk.nonlocals.add(f'l{instr.imm}')
            elif instr.op == InstrCode.GLOBAL_GET:
                glob: Global = self.module.globals[instr.imm]
                self.write(ind, f's{stack_size} = self.{glob.full_name}')
                stack_size += 1
            elif instr.op == InstrCode.GLOBAL_SET:
                glob: Global = self.module.globals[instr.imm]
                stack_size -= 1
                self.write(ind, f'self.{glob.full_name} = s{stack_size}')
            elif (instr.op == InstrCode.F64_CONST) or (instr.op == InstrCode.F32_CONST):
                format = '<d' if instr.op == InstrCode.F64_CONST else '<f'
                value = struct.unpack(format, instr.imm)[0]
                value_str = str(value)
                builtin = None
                if math.isnan(value):
                    value_str = 'nan'
                    builtin = 'nan'
                elif value == math.inf:
                    value_str = 'inf'
                    builtin = 'inf'
                elif value == -math.inf:
                    value_str = '-inf'
                    builtin = 'inf'
                exec_locals = {
                    'inf': math.inf,
                    'nan': math.nan,
                    'converted': None,
                }
                exec(f'converted = {value_str}', {}, exec_locals)
                converted = struct.pack(format, exec_locals['converted'])
                if converted == instr.imm:
                    self.write(ind, f's{stack_size} = {value}', 'f64.const')
                    if builtin is not None:
                        self.module.requested_builtins.add(builtin)
                else:
                    self.write(ind, f's{stack_size} = unpack("{format}", {instr.imm})', instr.info.name)
                    self.module.requested_builtins.add('unpack')
                stack_size += 1
            elif instr.op == InstrCode.TABLE_SET:
                stack_size -= 2
                table: Table = self.module.tables[instr.imm]
                self.write(ind, f'self.{table.full_name}[s{stack_size}] = s{stack_size + 1}', instr.info.name)
            elif instr.op == InstrCode.TABLE_GET:
                table: Table = self.module.tables[instr.imm]
                self.write(ind, f's{stack_size - 1} = self.{table.full_name}[s{stack_size - 1}]', instr.info.name)
            elif hasattr(instr.info, 'code') and instr.info.code:
                code = instr.info.code
                stack_diff = instr.info.stack
                self.write_code(ind, stack_size, code, instr, instr.info.name)
                stack_size += stack_diff
                if instr.info.builtins is not None:
                    self.module.requested_builtins.update(instr.info.builtins)
                if code.strip().startswith('#'):
                    counter -= 1
            else:
                #self.write(ind, 'pass', f'TODO {instr.info.name}')
                raise NotImplementedError(f'TODO {instr.info.name}')

    def generate_call(self, ind, stack_size, func_name, func_type, comment):
        stack_size -= len(func_type.params)
        params = ', '.join(f's{stack_size + x}' for x in range(len(func_type.params))) # TODO: check order of params
        results = ', '.join(f's{stack_size + x}' for x in range(len(func_type.results))) # TODO: check order of results
        if len(func_type.results) == 0:
            assign = ''
        elif len(func_type.results) == 1:
            assign = f'{results} = '
        else:
            assign = f'({results}) = '
        stack_size += len(func_type.results)
        self.write(ind, f'{assign}{func_name}({params})', comment)
        return stack_size

    def replace_object_imm_in_code(self, m: 're.Match[str]'):
        kind = m.group(1)
        index = int(m.group(2))
        if kind == 'f':
            collection = self.module.functions
        elif kind == 'm':
            collection = self.module.memories
        elif kind == 't':
            collection = self.module.tables
        elif kind == 'g':
            collection = self.module.globals
        return f'self.{collection[index].full_name}'

    def write_code(self, ind: int, stack_size: int, code: str, instr: SimpleNamespace, comment: str):
        for i in range(4):
            code = code.replace(f'{{{-i}}}', f's{stack_size - i}')
        if hasattr(instr, 'imm'):
            code = code.replace('{imm}', str(instr.imm))
            if isinstance(instr.imm, list) or isinstance(instr.imm, tuple):
                for index, value in enumerate(instr.imm):
                    code = code.replace(f'{{imm{index}}}', str(value))
            code = re.sub(r'(f|t|g|m)::([0-9]+)', self.replace_object_imm_in_code, code)
        for line in code.split('\n'):
            local_ind = ind + line.count('\t')
            line = line.replace('\t', '')
            self.write(local_ind, line, comment)
            comment = '^^^'

    def generate_branch(self, ind: int, stack_size: int, src_block: CodeBlock, levels: int, force_forward: bool, name: str, chunk: CodeBlock):
        dst_block = src_block
        for i in range(levels):
            dst_block = dst_block.parent
        forward = force_forward or (dst_block.kind != BlockKind.LOOP)
        dst_stack_base = dst_block.stack_base
        if forward:
            comment = f'{name}: branch from B{dst_block.id} @{dst_block.level}'
            keep = len(dst_block.type.results)
        else:
            comment = f'{name}: branch back to B{dst_block.id} @{dst_block.level}'
            keep = len(dst_block.type.params)
        src_stack_base = stack_size - keep
        if dst_stack_base != src_stack_base:
            for i in range(keep):
                self.write(ind, f's{dst_stack_base + i} = s{src_stack_base + i}', f'vvv unwind')
        if (not forward) and (dst_block == src_block):
            self.write(ind, f'continue', comment)
        else:
            self.write(ind, f'bt = {dst_block.level}; break', comment)
        # if src_stack_base:
        #     output = io.StringIO()
        #     print(forward, file=output)
        #     print(stack_size, file=output)
        #     print(keep, file=output)
        #     print(dst_block.type.params, file=output)
        #     print(dst_block.type.results, file=output)
        #     print(src_stack_base, file=output)
        #     print(dst_stack_base, file=output)
        #     self.write(0, '#' + output.getvalue().replace('\n', '\n# '))
        #     output.close()

    def generate_chunk(self, stack_size: int, func: Function, chunk: CodeBlock):

        # Temporary, use chunk output buffer as default output.
        self.push_output(self.chunks_output)

        # Generate source code starting from root block and gather some information from it.
        self.push_output()
        self.generate_block(3, stack_size, func, chunk, chunk)
        code_body = self.pop_output()

        # Generate chunk function header.
        self.write(2, f'def ch{chunk.chunk_id}():')

        # Generate nonlocal statement with potentially needed stack variables.
        chunk.max_shared_stack = max(
            chunk.max_shared_stack,
            chunk.stack_base + len(chunk.type.params),
            chunk.stack_base + len(chunk.type.results))
        func.max_shared_stack = max(func.max_shared_stack, chunk.max_shared_stack)
        if chunk.max_shared_stack > 0:
            self.write(3, f'nonlocal {", ".join(f"s{x}" for x in range(chunk.max_shared_stack))}')

        # Place the output in right place
        self.write(0, code_body)
        self.pop_output()


    # while s10 != 0:        # IF I33 @5
    #     # ...
    #     bt = 5; break  # BR 0 -> I33 @5
    #     # ...
    #     bt = 4; break  # BR 1 -> B31 @4
    #     # ...
    #     bt = 5; break              # ELSE i33 @5
    # # start of part that exists only if ELSE exists
    # else:                              # ^
    #     bt = 6                     # ^
    # while bt == 6:                     # ^
    #     # ...
    #     bt = 5; break  # BR 0 -> I33 @5
    #     # ...
    #     bt = 4; break  # BR 1 -> B31 @4
    #     # ...
    #     bt = 5; break  # END I33 @5
    # # end of part that exists only if ELSE exists
    # if bt < 5: break               # ^



    def divide_to_chunks(self, func: Function):
        # Divide blocks by nesting level
        chunks = []
        stack = list(func.body.children)
        func.body.level = 0
        func.body.chunk_id = 0
        func.body.chunk_start = True
        func.body.id = 0
        block_id = 1
        levels: 'list[dict[int,CodeBlock]]' = [{id(func.body): func.body}]
        while len(stack) > 0:
            block = stack.pop()
            stack += block.children
            block.level = block.parent.level + 1
            block.chunk_id = 0
            block.chunk_start = False
            block.id = block_id
            block_id += 1
            if len(levels) == block.level:
                levels.append({id(block): block})
            else:
                levels[block.level][id(block)] = block
            #print(f'Added {id(block)} @{block.level}')
        #func.levels = levels # TODO: remove
        chunk_id = 1
        while len(levels) > PY_MAX_LEVELS:
            #print(json.dumps(levels, indent=4, cls=JsonExporter))
            top = len(levels) - 1
            while len(levels[top]) == 0:
                top -= 1
            if top < PY_MAX_LEVELS:
                break
            root_block = list(levels[top].values())[0]
            for i in range(PY_MAX_LEVELS - 1):
                root_block = root_block.parent
            self.add_to_chunk(chunk_id, root_block, levels)
            root_block.chunk_start = True
            chunks.append(root_block)
            chunk_id += 1
        return chunks

    def add_to_chunk(self, chunk_id: int, block: CodeBlock, levels: 'list[dict[int,CodeBlock]]'):
        block.chunk_id = chunk_id
        #print(f'Deleted {id(block)} @{block.level}')
        del levels[block.level][id(block)]
        for child in block.children:
            if not child.chunk_start:
                self.add_to_chunk(chunk_id, child, levels)


if __name__ == '__main__':
    m = Parser()
    #mod = m.parse(open('test1.wasm', 'rb'))
    #mod = m.parse(open('test2.wasm', 'rb'))
    #mod = m.parse(open('test_as/fib.wasm', 'rb'))
    mod = m.parse(open('/home/doki/my/wasm2python/tests/workdir/bulk/bulk.2.wasm', 'rb'))
    g = Generator()
    res = g.generate(mod)
    with open('/home/doki/my/wasm2python/tests/workdir/bulk/bulk_2.py', 'w') as fd:
        fd.write(res)
