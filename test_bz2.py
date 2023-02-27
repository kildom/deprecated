
from out import WasmModuleClass

class ImportsEnv():
    def __init__(self):
        self.memory = bytearray(65536 * 100)
    def bzInternalError(self, code):
        raise Exception(f'Internal error {code}')

mod = WasmModuleClass(env=ImportsEnv())
mod()
mod.bzBuffToBuffDecompress()
