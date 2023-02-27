
from enum import Enum, IntEnum
import re
from types import SimpleNamespace

class ParseMethod(Enum):
    CUSTOM = 0
    NONE = 1
    BLOCK = 2
    U32 = 
    U64 = 3
    U64U64 = 4
    BYTE = 5
    MEM = 6
    MEM_LANE = 7

class InstrInfo(SimpleNamespace):
    name: str
    opcode: int
    parse: ParseMethod
    stack: int
    code: 'str|None'
    builtins: 'tuple[str]'
    def __init__(self, name, opcode, parse=ParseMethod.NONE, stack=0, code=None, builtins=None) -> None:
        super().__init__(name=name, opcode=opcode, parse=parse, stack=stack, code=code, builtins=builtins)

class Section(IntEnum):
    CUSTOM = 0
    TYPE = 1
    IMPORT = 2
    FUNCTION = 3
    TABLE = 4
    MEMORY = 5
    GLOBAL = 6
    EXPORT = 7
    START = 8
    ELEMENT = 9
    CODE = 10
    DATA = 11
    DATA_COUNT = 12

class WasmType(IntEnum):
    I32 = 0x7F
    I64 = 0x7E
    F32 = 0x7D
    F64 = 0x7C
    V128 = 0x7B
    FUNCREF = 0x70
    EXTERNREF = 0x6F

class BlockKind(IntEnum):
    FUNC = 0x00
    BLOCK = 0x02
    LOOP = 0x03
    IF = 0x04

class FunctionType(SimpleNamespace):
    params: 'list[WasmType]'
    results: 'list[WasmType]'

    def params_count(self):
        return len(self.params)

    def results_count(self):
        return len(self.results)

class ModuleObject(SimpleNamespace):
    def __init__(self, id, name_prefix) -> None:
        super().__init__()
        self.id = id
        self.imported = False
        self.exported = False
        self.name = f'_W_{name_prefix}{id}'
        self.full_name = f'_W_{name_prefix}{id}'

    def set_import(self, module, name):
        self.imported = True
        self.import_module = module
        self.import_name = name
        self.name = name
        self.full_name = name

    def set_export(self, name):
        self.exported = True
        self.export_name = name
        if not self.imported:
            self.name = name
            self.full_name = name



class Function(ModuleObject):

    special_function_id = 1000000000

    def __init__(self, id) -> None:
        if id is None:
            id = Function.special_function_id
            Function.special_function_id += 1
        super().__init__(id, 'func')
        if id >= 1000000000:
            self.name = f'_W_sf{self.id - 1000000000}'
            self.full_name = f'_W_sf{self.id - 1000000000}'
        self.max_shared_stack = 0


class Memory(ModuleObject):
    min: int
    max: 'int|None'
    def __init__(self, id) -> None:
        super().__init__(id, 'mem')


class Global(ModuleObject):
    def __init__(self, id) -> None:
        super().__init__(id, 'g')


class Table(ModuleObject):
    type: WasmType
    min: int
    max: 'int|None'
    def __init__(self, id) -> None:
        super().__init__(id, 'tab')



class CodeBlock(SimpleNamespace):
    def __init__(self, kind, type, parent:'CodeBlock', instr) -> None:
        self.kind = kind
        self.type = type
        self.parent = parent
        self.instr = instr
        self.is_br_target = False
        self.if_block = None
        self.else_instr = None
        self.body = []
        self.stack_base = 0
        self.break_level = 0
        self.py_func_block = False
        self.py_nested_function_index = 0
        self.children = []
        self.nonlocals: 'set[str]' = set()
        self.max_shared_stack = 0


class BranchKind(Enum):
    RETURN = 0
    FORWARD = 1
    BACKWARD = 2


class Branch():
    def __init__(self, target: CodeBlock, kind: BranchKind) -> None:
        self.target = target
        self.kind = kind
        self.py_outside_func = False

class Element(SimpleNamespace):
    id: int
    table: 'Table|None'
    offset_func: 'Function|None'
    values: 'list[Function]'
    declarative: bool
    indirect_initializer: bool
    reftype: WasmType
    def __init__(self) -> None:
        super().__init__()

class Data(SimpleNamespace):
    id: int
    memory: 'Memory|None'
    offset_func: 'Function|None'
    data: bytes
    def __init__(self) -> None:
        super().__init__()

class WasmModule(SimpleNamespace):
    types: 'list[FunctionType]'
    functions: 'list[Function]'
    tables: 'list[Table]'
    memories: 'list[Memory]'
    globals: 'list[Global]'
    elements: 'list[Element]'
    data: 'list[Data]'
    start_function: 'Function|None'
    func_import_count: int
    requested_builtins: 'set[str]'

    def __init__(self) -> None:
        self.types = list()
        self.functions = list()
        self.tables = list()
        self.memories = list()
        self.globals = list()
        self.elements = list()
        self.data = list()
        self.start_function = None
        self.func_import_count = 0
        self.requested_builtins = set()


def wasm_type_str(obj):
    if isinstance(obj, list) or isinstance(obj, tuple):
        if len(obj) == 0:
            return 'void'
        else:
            res = ', '.join(wasm_type_str(x) for x in obj)
            if len(obj) > 1:
                res = f'({res})'
            return res
    else:
        return str(WasmType(obj))[9:]
