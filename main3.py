

import json
from wasm_parser import Parser
from json_exporter import JsonExporter


m = Parser()
try:
    mod = m.parse(open('test2.wasm', 'rb'))
    print(json.dumps(mod, cls=JsonExporter, indent=4))
finally:
    pass
