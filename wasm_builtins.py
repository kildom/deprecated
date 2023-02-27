
import inspect
import textwrap


BUILTIN_LOCATION_GLOBAL = '__global__'
BUILTIN_LOCATION_CLASS = '__class__'
BUILTIN_LOCATION_CONTROL = '__control__'


def _imported(module_name):
    def dec(func):
        func._builtins_location = module_name
        return func
    return dec

def _global(func):
    func._builtins_location = BUILTIN_LOCATION_GLOBAL
    return func

def _class(func):
    func._builtins_location = BUILTIN_LOCATION_CLASS
    return func

def _control(func):
    func._builtins_location = BUILTIN_LOCATION_CONTROL
    return func

class Builtins:

    @staticmethod
    def get(name: str, **kwargs) -> 'tuple[list[str], str]':
        func = Builtins.__dict__[name]
        if hasattr(func, '_builtins_location'):
            source = textwrap.dedent(inspect.getsource(func)).strip().replace('\r', '')
            for k, v in kwargs.items():
                source = source.replace(f'___{k}___', v)
                name = name.replace(f'___{k}___', v)
            source = source.split('\n')
            source = list(x for x in source if not x.strip().startswith('@'))
            return (func._builtins_location, name, source)
        else:
            return func(name, **kwargs)

    @_class
    def __init__(self):
        #TODO: init
        pass

    @_class
    def _W_unreachable(self):
        if hasattr(self, '_W_unreachable_callback') and self._W_unreachable_callback:
            self._W_unreachable_callback()
        else:
            raise AssertionError('WebAssembly unreachable instruction')

    @_class
    def _W_memory_grow(self, mem, pages_inc, limits):
        pages = len(mem) // 0x10000
        if limits[1] and (pages + pages_inc > limits[1]):
            return 0xFFFFFFFF
        mem.extend(bytearray(pages_inc * 0x10000))
        return pages

    @_class
    def _W_table_grow(self, tab, value, size_inc, limits):
        size = len(tab)
        if limits[1] and (size + size_inc > limits[1]):
            return 0xFFFFFFFF
        tab.extend(value for _ in range(size_inc))
        return size

    @_class
    def _W_check_memory_size(self, mem, size, max_size):
        pass

    @_class
    def _W_check_table_size(self, table, size, max_size):
        pass

    @_global
    def div_s64(a, b):
        if b == 0:
            return a
        a = -(0x10000000000000000 - a) if a > 0x7FFFFFFFFFFFFFFFFF else a
        b = -(0x10000000000000000 - b) if b > 0x7FFFFFFFFFFFFFFFFF else b
        return (a // b) & 0xFFFFFFFFFFFFFFFFFF

    @_global
    def div_s32(a, b):
        if b == 0:
            return a
        a = -(0x100000000 - a) if a > 0x7FFFFFFF else a
        b = -(0x100000000 - b) if b > 0x7FFFFFFF else b
        return (a // b) & 0xFFFFFFFF

    @_global
    def rem_s64(a, b):
        raise NotImplementedError()

    @_global
    def rem_s32(a, b):
        raise NotImplementedError()

    @_global
    def trunc_sat_u64(a):
        raise NotImplementedError()

    @_global
    def trunc_sat_s64(a):
        raise NotImplementedError()

    @_global
    def trunc_sat_u32(a):
        raise NotImplementedError()

    @_global
    def trunc_sat_s32(a):
        raise NotImplementedError()

    @_imported('math')
    def floor():
        pass
    
    @_imported('math')
    def ceil():
        pass
    
    @_imported('math')
    def trunc():
        pass
    
    @_imported('math')
    def sqrt():
        pass
    
    @_imported('math')
    def copysign():
        pass

    @_imported('struct')
    def unpack():
        pass

    @_imported('struct')
    def pack():
        pass

    @_imported('struct')
    def unpack_from():
        pass

    @_imported('struct')
    def pack_into():
        pass

    @_imported('types')
    def SimpleNamespace():
        pass

    @_imported('base64')
    def b64decode():
        pass

    @_imported('math')
    def nan():
        pass

    @_imported('math')
    def inf():
        pass

    @_control
    def _W_get_export(self, name):
        return self._W_export_map[name]

    @_control
    def _W_get_import(self, module, name):
        return self._W_import_map[module][name]

    @staticmethod
    def simd(name, **kwargs):
        raise NotImplementedError("Fixed-width SIMD is not implemented")

