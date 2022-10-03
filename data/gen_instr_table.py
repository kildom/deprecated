
import csv
import os
from types import SimpleNamespace

FILE_HEADER = '''

#
# Generated from "data/instr.csv" using the "data/gen_instr_table.py" script.
# Do not edit manually.
#

from enum import IntEnum
from wasm_types import InstrInfo as II, ParseMethod

INSTRUCTIONS = {
    '''

ENUM_HEADER = '''
}

class InstrCode(IntEnum):
    '''

FILE_FOOTER = '''
'''

PARSE_METHODS = {
    '?': 'ParseMethod.CUSTOM',
    '': None,
    'bt': 'ParseMethod.BLOCK',
    'l': 'ParseMethod.U64',
    'x': 'ParseMethod.U64',
    'i32': 'ParseMethod.U64',
    'i64': 'ParseMethod.U64',
    'x y': 'ParseMethod.U64U64',
    't': 'ParseMethod.BYTE',
    'laneidx': 'ParseMethod.BYTE',
    'memarg laneidx': 'ParseMethod.MEM_LANE',
    'memarg': 'ParseMethod.MEM',
}

class Instruction(SimpleNamespace):

    def __init__(self, row:'list[str]') -> None:
        text = row[0].replace('\xA0', ' ').strip()
        bin = row[1].replace('\xA0', ' ').strip()
        stack_types = row[2].replace('\xA0', ' ').strip()
        custom_parse = row[3].replace('\xA0', ' ').strip()
        python_code = row[4].replace('\xA0', ' ').strip()

        tab = text.split(' ', 1)
        self.name = tab[0].strip()
        self.imm = tab[1].strip() if len(tab) > 1 else ''

        tab = bin.split(' ')
        tab = filter(lambda x: len(x.strip()), tab)
        tab = list(map(lambda x: int(x.strip(), 0), tab))
        tab.reverse()
        opcode = tab.pop()
        extopcode = 0
        for x in tab:
            extopcode <<= 7
            extopcode |= x & 0x7F
        self.opcode = opcode | (extopcode << 8)

        self.reserved = self.name == '(reserved)'
        if self.reserved:
            return

        tab = stack_types.split('→')
        tab = filter(lambda x: len(x.strip()), tab)
        tab = map(lambda x: x.strip('[] \xA0').split(' '), tab)
        tab = map(lambda x: list(map(lambda y: y.strip(' \xA0'), x)), tab)
        tab = list(map(lambda x: list(filter(lambda y: len(y.strip(' \xA0')), x)), tab))
        known_stack = True
        for x in tab:
            for y in x:
                known_stack = known_stack and (y in ('t', 'i32', 'i64', 'f32', 'f64', 'v128', 'funcref'))
        if known_stack and (len(tab) == 2):
            self.stack_pop = len(tab[0])
            self.stack_push = len(tab[1])
            self.stack = self.stack_push - self.stack_pop
        else:
            self.stack_pop = None
            self.stack_push = None
            self.stack = None

        self.code = python_code if len(python_code) else None

        if (self.code is not None) and (self.stack is None):
            raise Exception(f'Stack handling for "{stack_types}" is not defied ({self.name}).')

        if custom_parse == 'y':
            self.parse = PARSE_METHODS['?']
        elif self.imm in PARSE_METHODS:
            self.parse = PARSE_METHODS[self.imm]
        else:
            raise Exception(f'Parser for "{self.imm}" is not defied ({self.name}).')


    def get_output(self):
        if (self.opcode & 0xFF) < 0xFC:
            opcode_str = f'0x{self.opcode:02X}'
        else:
            opcode_str = f'0x{self.opcode:04X}'
        
        output = f'{opcode_str}: '

        if self.reserved:
            return f'# {output}reserved'

        params = []
        params.append(f'opcode={opcode_str}')
        params.append(f'name=\'{self.name}\'')
        if self.parse is not None:
            params.append(f'parse={self.parse}')
        if self.stack is not None:
            params.append(f'stack={"+" if self.stack > 0 else ""}{self.stack}')
        if self.code is not None:
            params.append(f'code=\'{self.code}\'')
        
        params = ', '.join(params)

        output += f'II({params})'

        return output

    def get_enum_item(self):
        r = instr.name.upper().replace('.', '_')
        r += ' = '
        if (self.opcode & 0xFF) < 0xFC:
            r += f'0x{self.opcode:02X}'
        else:
            r += f'0x{self.opcode:04X}'
        return r


with open(os.path.dirname(__file__) + '/instr.csv', 'r') as csvfile:
    r = csv.reader(csvfile, delimiter=',', doublequote=True, quotechar='"', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True, strict=True)
    rows = list(r)
    rows = rows[1:]

all:'list[Instruction]' = list()

for row in rows:
    all.append(Instruction(row))

output = []
enum = []
reserved_group = []
for instr in all:
    line = instr.get_output()
    if instr.reserved:
        reserved_group.append(line)
        continue
    if len(reserved_group) > 3:
        output.append(reserved_group[0])
        output.append('# ... : reserved')
        output.append(reserved_group[-1])
    elif len(reserved_group) > 0:
        output += reserved_group
    reserved_group = []
    output.append(line)
    enum.append(instr.get_enum_item())

with open(os.path.dirname(__file__) + '/../instr.py', 'w') as pyfile:
    pyfile.write(FILE_HEADER)
    pyfile.write(',\n    '.join(output))
    pyfile.write(ENUM_HEADER)
    pyfile.write('\n    '.join(enum))
    pyfile.write(FILE_FOOTER)
