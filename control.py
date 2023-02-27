
class Control:
    def __init__(self, module):
        self.module = module

    @staticmethod
    def get_export(wasm_name):
        if wasm_name in Control.export_wasm2py:
            return Control.export_wasm2py[wasm_name]
        return wasm_name

    @staticmethod
    def get_import_module(wasm_name):
        if wasm_name in Control.module_wasm2py:
            return Control.module_wasm2py[wasm_name]
        return wasm_name

    @staticmethod
    def get_import(wasm_module_name, wasm_import_name):
        if wasm_module_name in Control.module_wasm2py:
            py_module_name = Control.module_wasm2py[wasm_module_name]
        else:
            py_module_name = wasm_module_name
        if (py_module_name in Control.import_wasm2py) and (wasm_import_name in Control.import_wasm2py[py_module_name]):
            return (py_module_name, Control.import_wasm2py[py_module_name][wasm_import_name])
        return (py_module_name, wasm_import_name)

    def set_unreachable(self, callback):
        self.module._W_unreachable_callback = callback
