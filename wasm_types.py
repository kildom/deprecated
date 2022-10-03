
from enum import Enum, IntEnum
from types import SimpleNamespace

class ParseMethod(Enum):
    CUSTOM = 0
    NONE = 1
    BLOCK = 2
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
    def __init__(self, name, opcode, parse=ParseMethod.NONE, stack=0, code=None) -> None:
        super().__init__(name=name, opcode=opcode, parse=parse, stack=stack, code=code)

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
    ELSE = 0x05
