

```js

/* TODO: Freeze functionality:

Example:
await setSandboxModule(fetch('sandbox.wasm'), { allowFreezing: true });
sandboxPrototype = await sandbox.instantiate(...)
sandboxPrototype.extend(sandboxPolyfill.console)      // console
sandboxPrototype.extend(sandboxPolyfill.textCoders)   // TextEncode / TextDecode(only UTF-8, UTF-16le, latin1)
sandboxPrototype.extend(sandboxPolyfill.timeout)      // setTimeout / setInterval
sandboxPrototype.registerImports(importObject, unfreezeCallback)
sandboxPrototype.execute(..., { unfreezeCallback })
let checkpoint = sandboxPrototype.freeze()

Execute many times:
    sb = sandbox.instantiate({
        unfreeze: checkpoint,
        ...
    });
    sb.execute ...

OR:
    sb = checkpoint.instantiate({...}),
    sb.execute ...

Save checkpoint, e.g. as a file:
    myUint8Array = checkpoint.raw() - returns 

freeze() will:
    * make sure that it is top level call, not from within the sandbox
    * take current stack pointer, using export __Internal__getStackPointer()
    * take entire memory except unused stack
    * take registered sandbox imports and exports (make sure that all imports were registered with unfreezeCallback)
    * process module bytecode to produce new one:
        * Replace __stack_pointer initial value to new one.
          (stack pointer global detection: global that was used by __Internal__getStackPointer function)
        * Remove "data" section and replace them with entries retrieved from memory.
        * Processing instructions of the module bytes can be prepared after release building.
          Instructions can be in custom section, marked as {{...}} below.
          Custom section must be the last one to allow fast access.
            * Copy from 0 to {{offset of global sections size field}},
            * Write LEB128(x + LEB128_SIZE(stack_pointer)), where x is the {{global sections size except stack pointer value}}
            * Copy from {{offset after global sections size}} to {{offset of stack pointer value}}
            * Write LEB128(stack_pointer)
            * Copy from {{offset after stack pointer value}} to {{offset of data section size}}
            * Write new data section
            * Copy from {{offset after data section}} to the end
    * compile new module
    * return all needed information for later unfreezing

unfreeze will:
    * instantiate from the new module,
    * restore import/exports and call appropriate unfreezeCallback
    * call execute unfreezeCallback
      (both types of callbacks must be called in original order)
    * unfreezeCallback from registerImports may return a new object containing a new import functions.

processing module after the build:
    * optionally: Replace export __stack_pointer with __Internal__set/getStackPointer (looks like this can improve performance)
    * Make sure that there just one memory (with disassembly)
    * Make sure that function table is not modified (with disassembly)
    * Make sure that there are no passive entries in data section (with disassembly)
    * Prepare instructions for generating freezed modules: 7 numbers described above.

Simpler approach:
    * Instead of processing the module, only copy memory and stack pointer.
    * unfreeze will instantiate the module from scratch, grow and copy memory, call __Internal__setStackPointer.
    * allowFreezing: true in setSandboxModule will not be needed in this case.

*/
```
