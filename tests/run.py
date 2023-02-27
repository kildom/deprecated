

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

class Args(SimpleNamespace):
    json: Path
    module: Path
    command: int
    def __init__(self):
        parser = ArgumentParser()
        parser.add_argument('--json', type=Path)
        parser.add_argument('--module', type=Path)
        parser.add_argument('--command', type=int)
        super().__init__(**parser.parse_args().__dict__)

args = Args()


def load_json(file: Path):
    with open(file, 'r') as fd:
        return json.load(fd)

def main():
    workdir_path.mkdir(exist_ok=True)
    for wast in testsuite_path.glob('*.wast'):
        if wast.name.startswith('simd'): continue
        
        json_path = workdir_path / wast.with_suffix('.json').name
        subprocess.check_call([wast2json_path, wast, '-o', json_path])
        data = load_json(json_path)
        print('Running: ', data['source_filename'])
        module_path = None
        for index, command in enumerate(data['commands']):
            if command['type'] == 'module':
                module_path = json_path.parent / command['filename']
                subprocess.check_call([sys.executable, __file__, '--json', json_path, '--module', module_path, '--command', str(index)])
            elif command['type'] == 'assert_return':
                subprocess.check_call([sys.executable, __file__, '--json', json_path, '--module', module_path, '--command', str(index)])
            elif command['type'] == 'assert_trap':
                subprocess.check_call([sys.executable, __file__, '--json', json_path, '--module', module_path, '--command', str(index)])
            elif command['type'] == 'assert_invalid':
                subprocess.check_call([sys.executable, __file__, '--json', json_path, '--module', module_path, '--command', str(index)])
            elif command['type'] == 'assert_malformed':
                print('Skipping assert_malformed: ', command['filename'])
            else:
                raise NotImplementedError(f'Unknown command type "{command["type"]}"')
            #if index == 4: exit()


def py_name(name):
    return re.sub(r'(^[0-9])|[^A-Za-z0-9_]', r'_\1', name)

def get_module_name():
    return py_name(args.module.with_suffix('').name)

def get_module_path():
    return (args.module.parent / get_module_name()).with_suffix('.py')

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
    if math.isnan(a) and math.isnan(b):
        return True
    return a == b

def test_assert_return(command):
    if sys.path[-1] != str(get_module_path().parent):
        sys.path.append(str(get_module_path().parent))
    loc = {'m': None}
    exec(f'from {get_module_name()} import WasmModuleClass\nm=WasmModuleClass', {}, loc)
    Module = loc['m']
    action = command['action']
    expected = command['expected'] if 'expected' in command else []
    if action['type'] == 'invoke':
        mod = Module()
        func = getattr(mod, py_name(action['field']))
        func_args = []
        for arg in action['args']:
            func_args.append(convert_to_value(arg['type'], arg['value']))
        result = func(*func_args)
        if len(expected) == 0:
            assert result is None
        elif len(expected) == 1:
            exp = convert_to_value(expected[0]['type'], expected[0]['value'])
            print(result, '==', exp)
            assert compare(result, exp)
        else:
            for index, exp in enumerate(expected):
                exp = convert_to_value(exp['type'], exp['value'])
                print(result[index], '==', exp)
                assert compare(result[index], exp)
    else:
        raise NotImplementedError(f'Action type "{action["type"]}" not implemented')

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
    if args.json is None:
        main()
    else:
        exec_command()

