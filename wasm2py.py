
import sys
from wasm_parser import Parser
from py_generator import Generator
#from py_generator2 import Generator

def wasm2py(input, output):
    parser = Parser()
    mod = parser.parse(input)
    generator = Generator()
    output.write(generator.generate(mod))


if __name__ == '__main__':
    #with open(sys.argv[1], 'rb') as input, open(sys.argv[2], 'w') as output:
    #with open('test2.wasm', 'rb') as input, open('test1.wasm.py', 'w') as output:
    with open('test_as/fib.wasm', 'rb') as input, open('test1.wasm.py', 'w') as output:
        wasm2py(input, output)
