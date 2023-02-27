

import json
import math
import os
import re
import struct
import sys
from pathlib import Path
import subprocess
import shutil
from argparse import ArgumentParser
import traceback
from types import SimpleNamespace
from os import path

sys.path.append(path.dirname(path.dirname(path.abspath(__file__))))
from wasm2py import wasm2py

testsuite_path = Path(__file__).parent / 'testsuite'
wast2json_path = Path(__file__).parent / 'wabt/bin/wast2json'
workdir_path = Path(__file__).parent / 'workdir'


Module = None
registered = {}

def load_json(file: Path):
    with open(file, 'r') as fd:
        return json.load(fd)

PYTHON_KEYWORDS = set([
    'False', 'await','else','import','pass',
    'None', 'break','except','in','raise',
    'True', 'class','finally','is','return',
    'and', 'continue','for','lambda','try',
    'as', 'def','from','nonlocal','while',
    'assert', 'del','global','not','with',
    'async', 'elif','if','or','yield',
])

def py_name(name):
    name = re.sub(r'(^[0-9])|[^A-Za-z0-9_]+', r'_\1', name)
    if name in PYTHON_KEYWORDS:
        name = '_' + name
    return name

def get_module_name(wasm: Path):
    return py_name(wasm.with_suffix('').name)

def get_module_path(wasm: Path):
    return (wasm.parent / get_module_name(wasm)).with_suffix('.py')

def compile_module(wasm: Path):
    with open(wasm, 'rb') as input, open(get_module_path(wasm), 'w') as output:
        wasm2py(input, output)
    sys.path_importer_cache = {}
    mod_path = str(get_module_path(wasm).parent)
    if mod_path not in sys.path:
        sys.path.append(mod_path)
    loc = {'m': None}
    exec(f'from {get_module_name(wasm)} import WasmModuleClass\nm=WasmModuleClass', {}, loc)
    return loc['m']

def instantiate_module(ModuleClass, registered):
    imports = {}
    for module_name, dep in registered.items():
        module_name = ModuleClass.control.get_import_module(module_name)
        imports[module_name] = dep
    module = ModuleClass(**imports)
    module()
    return module

def test_assert_return(command, module):
    action = command['action']
    expected = command['expected'] if 'expected' in command else []
    if action['type'] == 'invoke':
        func = getattr(module, module.control.get_export(action['field']))
        func_args = []
        for arg in action['args']:
            func_args.append(convert_to_value(arg['type'], arg['value']))
        result = func(*func_args)
        if len(expected) == 0:
            assert result is None
        elif len(expected) == 1:
            exp = convert_to_value(expected[0]['type'], expected[0]['value'])
            assert compare(result, exp)
        else:
            for index, exp in enumerate(expected):
                exp = convert_to_value(exp['type'], exp['value'])
                assert compare(result[index], exp)
    else:
        raise NotImplementedError(f'Action type "{action["type"]}" not implemented')

def main():
    workdir_path.mkdir(exist_ok=True)
    for wast in testsuite_path.glob('*.wast'):
        if wast.name.startswith('simd'): continue

        subdir = workdir_path / py_name(wast.with_suffix('').name)
        subdir.mkdir(exist_ok=True)
        json_path = subdir / wast.with_suffix('.json').name
        subprocess.check_call([wast2json_path, wast, '-o', json_path])
        data = load_json(json_path)
        with open('a.json', 'w') as f: json.dump(data, f, indent=4)
        print('Running: ', data['source_filename'])
        module = None
        registered = {}
        for index, command in enumerate(data['commands']):
            try:
                if command['type'] == 'module':
                    file = json_path.parent / command['filename']
                    print(f'Compiling module: {file}')
                    ModuleClass = compile_module(file)
                    module = instantiate_module(ModuleClass, registered)
                elif command['type'] == 'register':
                    registered[command['as']] = module
                elif command['type'] in ('action', 'assert_return'):
                    test_assert_return(command, module)
                elif command['type'] == 'assert_trap':
                    pass#subprocess.check_call([sys.executable, __file__, '--json', json_path, '--module', module_path, '--command', str(index)])
                elif command['type'] == 'assert_invalid':
                    pass#subprocess.check_call([sys.executable, __file__, '--json', json_path, '--module', module_path, '--command', str(index)])
                elif command['type'] == 'assert_malformed':
                    pass#print('Skipping assert_malformed: ', command['filename'])
                elif command['type'] == 'assert_unlinkable':
                    pass#print('Skipping assert_malformed: ', command['filename'])
                elif command['type'] == 'assert_uninstantiable':
                    pass#print('Skipping assert_malformed: ', command['filename'])
                elif command['type'] == 'assert_exhaustion':
                    pass#print('Skipping assert_malformed: ', command['filename'])
                else:
                    raise NotImplementedError(f'Unknown command type "{command["type"]}"')
                #if index == 4: exit()
            except:
                print(command)
                raise


def test_module(command):
    with open(args.module, 'rb') as input, open(get_module_path(), 'w') as output:
        wasm2py(input, output)

def convert_to_value(type, value):
    if type in ('i32', 'i64'):
        return int(value)
    elif type == 'f64':
        return struct.unpack('<d', int(value).to_bytes(8, 'little'))[0]
    elif type == 'f32':
        return struct.unpack('<f', int(value).to_bytes(4, 'little'))[0]
    else:
        raise NotImplementedError(f'Argument type "{type}" not implemented')

def compare(a, b):
    if isinstance(a, float) and isinstance(b, float) and math.isnan(a) and math.isnan(b):
        return True
    return a == b

def test_assert_trap(command):
    pass

def test_assert_invalid(command):
    pass

def exec_command():
    data = load_json(args.json)
    command = data['commands'][args.command]
    try:
        if command['type'] == 'module':
            test_module(command)
        elif command['type'] == 'assert_return':
            test_assert_return(command)
        elif command['type'] == 'assert_trap':
            test_assert_trap(command)
        elif command['type'] == 'assert_invalid':
            test_assert_invalid(command)
        else:
            raise NotImplementedError(f'Unknown command type "{command["type"]}"')
        print(f'{data["source_filename"]}:{command["line"]}: Command {command["type"]} ({args.command}) from "{args.json.name}" with module "{args.module.name}": SUCCESS')
    except:
        print(f'{data["source_filename"]}:{command["line"]}: Command {command["type"]} ({args.command}) from "{args.json.name}" with module "{args.module.name}": FAILURE')
        print(traceback.format_exc())
        exit(1)

if __name__ == '__main__':
    main()
