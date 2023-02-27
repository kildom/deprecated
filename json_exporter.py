
import json
import base64
from types import SimpleNamespace
from wasm_types import BlockKind, CodeBlock, Function, FunctionType, Global, InstrInfo, Memory, ModuleObject, Table, WasmModule, WasmType

def wasm_type(obj):
    if isinstance(obj, list) or isinstance(obj, tuple):
        if len(obj) == 0:
            return 'void'
        else:
            res = ', '.join(wasm_type(x) for x in obj)
            if len(obj) > 1:
                res = f'({res})'
            return res
    else:
        return str(WasmType(obj))[9:]

def encode_type(obj: FunctionType):
    return 

def pull_attr(src, name, default=None):
    if name in src:
        result = src[name]
        del src[name]
    else:
        result = default
    return result

def encode_id(obj):
    res = type(obj).__name__ + '#' + str(id(obj))
    if isinstance(obj, FunctionType):
        res = '(' + wasm_type(obj.params) + ') -> (' + wasm_type(obj.results) + ') ' + res
    elif isinstance(obj, ModuleObject):
        res = f'({obj.id}) {res}'
    elif isinstance(obj, InstrInfo):
        res = f'{obj.name} ({obj.opcode})    {obj.stack}'
    elif isinstance(obj, SimpleNamespace) and hasattr(obj, 'op') and hasattr(obj, 'info'):
        res = f'{obj.info.name} #{str(id(obj))}'
    return res

def encode_full(obj):
    src = dict(obj.__dict__)
    d = { '#': encode_id(obj) }
    if isinstance(obj, WasmModule):
        d.update(**{
            'types': [encode_full(t) for t in pull_attr(src, 'types', [])],
            'functions': [encode_full(t) for t in pull_attr(src, 'functions', [])],
            'tables': [encode_full(t) for t in pull_attr(src, 'tables', [])],
            'memories': [encode_full(t) for t in pull_attr(src, 'memories', [])],
            'globals': [encode_full(t) for t in pull_attr(src, 'globals', [])],
        })
    elif isinstance(obj, FunctionType):
        d.update(**{
            'params': wasm_type(pull_attr(src, 'params', [])),
            'results': wasm_type(pull_attr(src, 'results', []))
        })
    elif isinstance(obj, Function):
        loc = pull_attr(src, 'locals', None)
        if loc is not None:
            d.update(locals=wasm_type(loc))
        body = pull_attr(src, 'body', None)
        if body is not None:
            d.update(body=encode_full(body))
    elif isinstance(obj, CodeBlock):
        body = pull_attr(src, 'body', [])
        d.update(kind=str(BlockKind(pull_attr(src, 'kind', None)))[10:])
        d.update(**src)
        src = {}
        d.update(body=[encode_full(instr) for instr in body])
    elif isinstance(obj, SimpleNamespace):
        block = pull_attr(src, 'block', None)
        d.update(**src)
        src = {}
        if block is not None:
            d.update(block=encode_full(block))
    d.update(**src)
    return d


class JsonExporter(json.JSONEncoder):
    def __init__(self, *args, **kwargs):
        self.first = True
        super().__init__(*args, **kwargs)

    def default(self, obj):
        if isinstance(obj, bytes):
            return base64.b64encode(obj).decode('ascii')
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, SimpleNamespace):
            if self.first:
                self.first = False
                return encode_full(obj)
            else:
                return encode_id(obj)
        else:
            return super().default(obj)
