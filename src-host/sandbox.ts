import { SandboxWasmExport, SandboxWasmImport, SandboxWasmImportModule } from "./wasm-interface";
import { createWasiImports } from "./wasi-stubs";
import { ArrayBufferViewType } from "../src-guest/common";
import bootSourceCode from "./src-guest-boot";


//#region ------------------ Public interface

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

const CUSTOM_SECTION_NAME = 'js-sandbox-CpktVgXbZaAHZ1ADnsj7I';

export class GuestError extends Error {
    constructor(message: string, public guestName?: string, public guestStack?: string) {
        super(message);
    }
}

export class EngineError extends Error { }

export interface ModuleOptions {
    allowFreeze?: boolean;
    maxMemory?: number;
};

export interface InstantiateOptions {
    maxHeapSize?: number;
    // TODO: maxMessageEstimatedSize?: number;
};

export interface ExecuteOptions {
    fileName?: string;
    asModule?: boolean;
    returnValue?: boolean;
};

type RegisterCallbacksIds = { [key: string]: number | RegisterCallbacksIds };
export type RegisterCallbacks = { [key: string]: Function | RegisterCallbacks };
export type ExportsCallbacks = { readonly [key: string]: Function & RegisterCallbacks };

export interface Sandbox {
    execute(code: string, options?: ExecuteOptions): any;
    registerImports(callbacks: RegisterCallbacks): void;
    exports: ExportsCallbacks;
};

type ModuleSourceType = WebAssembly.Module | BufferSource | Response | Request | string | URL;

let moduleState: 'empty' | 'loading' | 'loaded' | Error = 'empty';
let module: WebAssembly.Module | undefined = undefined;
let moduleBinary: Uint8Array;

export async function setSandboxModule(
    source: ModuleSourceType | PromiseLike<ModuleSourceType> | undefined,
    options: ModuleOptions = {}
): Promise<undefined | Error> {

    if (source instanceof ArrayBuffer
        || (typeof SharedArrayBuffer !== 'undefined' && source instanceof SharedArrayBuffer)
    ) {
        moduleBinary = new Uint8Array(source);
    } else if ((source instanceof Int8Array)
        || (source instanceof Uint8Array)
        || (typeof Uint8ClampedArray !== 'undefined' && source instanceof Uint8ClampedArray)
        || (source instanceof Int16Array)
        || (source instanceof Uint16Array)
        || (source instanceof Int32Array)
        || (source instanceof Uint32Array)
        || (source instanceof Float32Array)
        || (source instanceof Float64Array)
        || (typeof BigInt64Array !== 'undefined' && source instanceof BigInt64Array)
        || (typeof BigUint64Array !== 'undefined' && source instanceof BigUint64Array)
    ) {
        moduleBinary = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else {
        throw new Error('aaa');
    }

    if (options.maxMemory) {
        let blocks = Math.ceil(options.maxMemory / 65536);
        moduleBinary = new Uint8Array(moduleBinary.buffer.slice(
            moduleBinary.byteOffset,
            moduleBinary.byteOffset + moduleBinary.byteLength));
        let sectionDataStart = moduleBinary.length - 24 - 32;
        let sectionName = decoderUtf8.decode(moduleBinary.subarray(sectionDataStart, sectionDataStart + 32));
        if (sectionName != CUSTOM_SECTION_NAME) {
            throw new Error('This binary does not allow changing its memory size limit.');
        }
        let struct = new DataView(moduleBinary.buffer, sectionDataStart + 32, 24);
        let version = struct.getUint32(4 * 0, true);
        let stackPointerValueBegin = struct.getUint32(4 * 1, true);
        let stackPointerValueEnd = struct.getUint32(4 * 2, true);
        let dataSectionBegin = struct.getUint32(4 * 3, true);
        let dataSectionEnd = struct.getUint32(4 * 4, true);
        let memLimitsOffset = struct.getUint32(4 * 5, true);
        moduleBinary[memLimitsOffset + 3] = (blocks & 0x7F) | 0x80;
        moduleBinary[memLimitsOffset + 4] = ((blocks >> 7) & 0x7F) | 0x80;
        moduleBinary[memLimitsOffset + 5] = ((blocks >> 14) & 0x7F);
    }

    module = await WebAssembly.compile(moduleBinary);

    //module = source as any; // TODO: Other types of sources
    /*
    while 'loading':
        wait for completed
    set 'loading'
    while source is PromiseLike:
        source = await source
    if source is Module:
        module = source
        set 'loaded'
        resolve promise
    if source is BufferSource:
        wasm.compile and do the same as "is Module"
    if source is Response:
        wasm.compileStreaming and do the same as "is Module"
    if source is Request or string or URL:
        wasm.compileStreaming(fetch(...)) and do the same as "is Module"
    catch:
        set error state and throw it
    */
    return undefined; // do not throw, return Error if failed, undefiend otherwise.
}

export async function instantiate(options?: InstantiateOptions): Promise<Sandbox> {
    await ensureModuleLoaded();
    let sandbox = createSandbox();
    let instance = await WebAssembly.instantiate(module as WebAssembly.Module, sandbox.imports as any);
    sandbox.init(instance, options);
    (sandbox as any).__Internal__instance = instance;
    return sandbox;
}


//#endregion


enum SandboxCommand {
    Register = -1,
    Call = -2,
};


enum ExecuteFlags {
    Script = 0,
    Module = 1,
    TransferBufferOwnership = 2,
    ReturnValue = 4,
};

async function ensureModuleLoaded() {
    // TODO: if module is not set, use fetch('sandbox.wasm'), if failed, try to guess script location and do fetch('[script_file_without_extension].wasm')
    return;
}


interface SandboxInternal extends Sandbox {
    imports: SandboxWasmImport;
    init(instance: WebAssembly.Instance, options?: InstantiateOptions): void;
}

enum SandboxFlags {
    Latin1Allowed = 1,
    Utf16Allowed = 2,
};

enum Encodings {
    Utf8 = 0,
    Latin1 = 1,
    Utf16 = 2,
};

function createTextDecoderIfAvailable(encoding: string): TextDecoder | undefined {
    try {
        return new TextDecoder(encoding);
    } catch (e) {
        return undefined;
    }
}

const encoder = new TextEncoder();
const decoderUtf8 = new TextDecoder();
const decoderLatin1 = createTextDecoderIfAvailable('latin1');
const decoderUtf16 = createTextDecoderIfAvailable('utf-16le');


class SandboxEntryIsNotARealException extends Error { };


function entry(): never {
    throw new SandboxEntryIsNotARealException();
};


function createSandbox(): SandboxInternal {

    let exports: SandboxWasmExport;

    let memory: WebAssembly.Memory;
    let arrayBuffer: ArrayBuffer = undefined as any;
    let byteArray: Uint8Array; // TODO: Maybe not needed

    const valueStack: any[] = [];
    const reusableStack: any[] = [];
    let errorState: any = undefined;

    let sharedBufferPointer: number;
    let sharedBufferSize: number;

    function refreshViews(): void {
        if (arrayBuffer !== memory.buffer) {
            arrayBuffer = memory.buffer;
            byteArray = new Uint8Array(arrayBuffer);
        }
    }

    function decodeString(encoding: number, buffer: number, size: number): string {
        refreshViews();
        if (encoding === Encodings.Latin1) {
            return decoderLatin1!.decode(new Uint8Array(arrayBuffer, buffer, size));
        } else if (encoding === Encodings.Utf16) {
            return decoderUtf16!.decode(new Uint8Array(arrayBuffer, buffer, size));
        } else {
            return decoderUtf8.decode(new Uint8Array(arrayBuffer, buffer, size));
        }
    }

    function startup() {
        if (exports._start) {
            try {
                exports._start();
            } catch (error) {
                if (error instanceof SandboxEntryIsNotARealException) {
                    return;
                } else {
                    throw error;
                }
            }
            throw Error('Sandbox startup failed.');
        }
    }

    function createExportWrapper(number: number): Function {
        return function (...args: any[]): any {
            return call(number, ...args);
        }
    }

    function registerExports(branch: RegisterCallbacks, ids: RegisterCallbacksIds) {
        for (let name in ids) {
            let value = ids[name];
            if (typeof value === 'object') {
                if (typeof branch[name] !== 'object') {
                    branch[name] = {};
                }
                registerExports(branch[name] as any, value);
            } else if (typeof value === 'number') {
                branch[name] = createExportWrapper(value);
            }
        }
    }


    let sandboxImports: SandboxWasmImportModule.sandbox = {

        entry,

        log(ptr: number, len: number): void {
            refreshViews();
            let str: string;
            str = decoderUtf8.decode(new Uint8Array(arrayBuffer, ptr, len));
            console.log('SANDBOX:', str);
        },

        clearValues(): void {
            valueStack.splice(0);
            reusableStack.splice(0);
            errorState = undefined;
        },

        createNull(): void {
            if (errorState) return;
            valueStack.push(null);
        },

        createUndefined(): void {
            if (errorState) return;
            valueStack.push(undefined);
        },

        createError(encoding: number, buffer: number, size: number): void {
            if (errorState) return;
            try {
                let guestName = valueStack.pop();
                let guestStack = valueStack.pop();
                valueStack.push(new GuestError(decodeString(encoding, buffer, size), guestName, guestStack));
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createEngineError(encoding: number, buffer: number, size: number): void {
            if (errorState) return;
            try {
                valueStack.push(new EngineError(decodeString(encoding, buffer, size)));
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createArray(): void {
            if (errorState) return;
            valueStack.push([]);
        },

        createObject(): void {
            if (errorState) return;
            valueStack.push({});
        },

        createBigInt(encoding: number, buffer: number, size: number): void {
            if (errorState) return;
            try {
                valueStack.push(BigInt(decodeString(encoding, buffer, size)));
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createNumber(num: number): void {
            if (errorState) return;
            valueStack.push(num);
        },

        createDate(num: number): void {
            if (errorState) return;
            try {
                valueStack.push(new Date(num));
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createRegExp(lastIndex: number): void {
            if (errorState) return;
            try {
                let flags = valueStack.pop();
                let source = valueStack.pop();
                let result = new RegExp(source, flags);
                result.lastIndex = lastIndex;
                valueStack.push(result);
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createArrayItem(index: number): void {
            if (errorState) return;
            try {
                let value = valueStack.pop();
                let array = valueStack.at(-1);
                array[index] = value;
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createString(encoding: number, buffer: number, size: number): void {
            if (errorState) return;
            try {
                valueStack.push(decodeString(encoding, buffer, size));
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createObjectProperty(encoding: number, buffer: number, size: number): void {
            if (errorState) return;
            try {
                let value = valueStack.pop();
                let obj = valueStack.at(-1);
                let name = decodeString(encoding, buffer, size);
                obj[name] = value;
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createBoolean(num: number): void {
            if (errorState) return;
            valueStack.push(num === 0 ? false : true);
        },

        keepValue(): number {
            if (errorState) return 0;
            try {
                let index = reusableStack.length;
                reusableStack.push(valueStack.at(-1));
                return index;
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
                return 0;
            }
        },

        reuseValue(index: number): void {
            if (errorState) return;
            try {
                valueStack.push(reusableStack[index]);
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createArrayBuffer(ptr: number, size: number) {
            if (errorState) return;
            try {
                refreshViews();
                valueStack.push(arrayBuffer.slice(ptr, ptr + size));
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        createArrayBufferView(type: number, offset: number, size: number) {
            if (errorState) return;
            try {
                switch (type) {
                    default:
                    case ArrayBufferViewType.Uint8Array:
                        valueStack.push(new Uint8Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Int8Array:
                        valueStack.push(new Int8Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Uint8ClampedArray:
                        valueStack.push(new Uint8ClampedArray(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Int16Array:
                        valueStack.push(new Int16Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Uint16Array:
                        valueStack.push(new Uint16Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Int32Array:
                        valueStack.push(new Int32Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Uint32Array:
                        valueStack.push(new Uint32Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Float32Array:
                        valueStack.push(new Float32Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.Float64Array:
                        valueStack.push(new Float64Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.BigInt64Array:
                        valueStack.push(new BigInt64Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.BigUint64Array:
                        valueStack.push(new BigUint64Array(valueStack.pop(), offset, size));
                        break;
                    case ArrayBufferViewType.DataView:
                        valueStack.push(new DataView(valueStack.pop(), offset, size));
                        break;
                }
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
            }
        },

        callToHost(command: number): number {
            switch (command) {
                case SandboxCommand.Register:
                    registerExports(sandbox.exports, valueStack[0]);
                    return 1;
                default: {
                    let func = importFunctions[command];
                    if (!func) {
                        createGuestValue(new Error('Invalid command id.'));
                        return 0;
                    }
                    try {
                        let ret = func(...valueStack);
                        createGuestValue(ret);
                        return 1;
                    } catch (error) {
                        try {
                            createGuestValue(error);
                        } catch (e) { }
                        return 0;
                    }
                    break;
                }
            }
        }
    };

    const wasiImports = createWasiImports();

    function mallocSafe(size: number): number {
        let ptr = exports.malloc(size);
        refreshViews();
        if (ptr === 0) {
            throw new Error('Sandbox out of memory.');
        }
        return ptr;
    }

    function reallocSafe(oldPtr: number, newSize: number, oldSize: number): number {
        let newPtr = exports.realloc(oldPtr, newSize, oldSize);
        refreshViews();
        if (newPtr === 0) {
            freeSafe(oldPtr);
            throw new Error('Sandbox out of memory.');
        }
        return newPtr;
    }

    function freeSafe(ptr: number): void {
        exports.free(ptr);
    }

    function prepareCodeBuffer(code: string, fileName: string): [number, number, boolean] {
        refreshViews();
        // Encode file name
        let stat = encoder.encodeInto(fileName + '\0', new Uint8Array(arrayBuffer, sharedBufferPointer, sharedBufferSize));
        if (stat.read < fileName.length + 1 || stat.written >= sharedBufferSize) {
            throw new Error('Source file name is too long.');
        }
        // Calculate remaining buffer
        let bufferPtr = sharedBufferPointer + stat.written;
        let bufferSize = sharedBufferSize - stat.written;
        if (code.length <= bufferSize) {
            let stat = encoder.encodeInto(code, new Uint8Array(arrayBuffer, bufferPtr, bufferSize));
            if (stat.read < code.length) {
                let remaining = 3 * (code.length - stat.read);
                let bufferSize = stat.written + remaining;
                let bufferPtr = mallocSafe(bufferSize);
                stat = encoder.encodeInto(code, new Uint8Array(arrayBuffer, bufferPtr, bufferSize));
                return [bufferPtr, stat.written, true];
            } else {
                return [bufferPtr, stat.written, false];
            }
        } else {
            bufferSize = 2 * code.length;
            bufferPtr = mallocSafe(bufferSize);
            let stat = encoder.encodeInto(code, new Uint8Array(arrayBuffer, bufferPtr, bufferSize));
            if (stat.read < code.length) {
                let remaining = 3 * (code.length - stat.read);
                bufferPtr = reallocSafe(bufferPtr, bufferSize, bufferSize + remaining);
                bufferSize += remaining;
                let stat2 = encoder.encodeInto(code, new Uint8Array(arrayBuffer, bufferPtr + stat.written, bufferSize - stat.written));
                return [bufferPtr, stat.written + stat2.written, true];
            } else {
                return [bufferPtr, stat.written, true];
            }
        }
    }

    let reusableObjects = new Map<any, number>();
    const arrayBuffers = new Map<ArrayBufferLike, { begin: number, end: number }>();

    function getArrayBufferViewType(input: any): ArrayBufferViewType {
        if (input instanceof Int8Array) return ArrayBufferViewType.Int8Array;
        if (input instanceof Uint8Array) return ArrayBufferViewType.Uint8Array;
        if (input instanceof Uint8ClampedArray) return ArrayBufferViewType.Uint8ClampedArray;
        if (input instanceof Int16Array) return ArrayBufferViewType.Int16Array;
        if (input instanceof Uint16Array) return ArrayBufferViewType.Uint16Array;
        if (input instanceof Int32Array) return ArrayBufferViewType.Int32Array;
        if (input instanceof Uint32Array) return ArrayBufferViewType.Uint32Array;
        if (input instanceof Float32Array) return ArrayBufferViewType.Float32Array;
        if (input instanceof Float64Array) return ArrayBufferViewType.Float64Array;
        if (input instanceof BigInt64Array) return ArrayBufferViewType.BigInt64Array;
        if (input instanceof BigUint64Array) return ArrayBufferViewType.BigUint64Array;
        if (input instanceof DataView) return ArrayBufferViewType.DataView;
        return ArrayBufferViewType.Uint8Array;
    }

    function encodeStringBuffer(value: string, callback: (ptr: number, size: number, encoding: Encodings) => void): void {
        refreshViews();
        if (value.length <= sharedBufferSize) {
            let stat = encoder.encodeInto(value, new Uint8Array(arrayBuffer, sharedBufferPointer, sharedBufferSize));
            if (stat.read >= value.length) {
                callback(sharedBufferPointer, stat.written, stat.read === stat.written ? Encodings.Latin1 : Encodings.Utf8);
                return;
            }
        }
        let firstSize = 2 * value.length;
        let strBufferPtr = mallocSafe(firstSize);
        refreshViews();
        let stat1 = encoder.encodeInto(value, new Uint8Array(arrayBuffer, strBufferPtr, firstSize));
        if (stat1.read >= value.length) {
            callback(strBufferPtr, stat1.written, stat1.read === stat1.written ? Encodings.Latin1 : Encodings.Utf8);
            return;
        }
        let remaining = value.length - stat1.read;
        let fullSize = stat1.written + 3 * remaining;
        strBufferPtr = reallocSafe(strBufferPtr, fullSize, firstSize);
        refreshViews();
        let stat2 = encoder.encodeInto(value.substring(stat1.read), new Uint8Array(arrayBuffer, strBufferPtr + stat1.written, fullSize - stat1.written));
        callback(strBufferPtr, stat2.written + stat1.written, Encodings.Utf8);
        freeSafe(strBufferPtr);
    }

    function encodeValue(value: any): void {
        switch (typeof value) {
            case 'object':
            case 'function': {
                if (value === null) {
                    exports.createNull();
                    return;
                }

                let reusableIndex = reusableObjects.get(value);

                if (reusableIndex !== undefined && reusableIndex >= 0) {
                    exports.reuseValue(reusableIndex);
                    return;
                }

                if (Array.isArray(value)) {
                    exports.createArray();
                    value.forEach((x, i) => {
                        encodeValue(x);
                        exports.createArrayItem(i);
                    });
                } else if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
                    let info = arrayBuffers.get(value);
                    let size = info!.end - info!.begin;
                    let ptr = mallocSafe(size);
                    refreshViews();
                    byteArray.set(new Uint8Array(value, info!.begin, size), ptr);
                    exports.createArrayBuffer(ptr, size);
                } else if (typeof value.byteLength === 'number'
                    && typeof value.byteOffset === 'number'
                    && (value.buffer instanceof ArrayBuffer || value.buffer instanceof SharedArrayBuffer)
                    && (value instanceof Int8Array || value instanceof Uint8Array
                        || value instanceof Int16Array || value instanceof Uint16Array
                        || value instanceof Int32Array || value instanceof Uint32Array
                        || value instanceof Float32Array || value instanceof Float64Array
                        || value instanceof BigInt64Array || value instanceof BigUint64Array
                        || value instanceof Uint8ClampedArray || value instanceof DataView
                    )
                ) {
                    let underlyingBuffer = value.buffer;
                    let info = arrayBuffers.get(underlyingBuffer);
                    encodeValue(underlyingBuffer);
                    let length = (value instanceof DataView) ? value.byteLength : value.length;
                    exports.createArrayBufferView(getArrayBufferViewType(value), value.byteOffset - info!.begin, length);
                } else if (value instanceof Date) {
                    exports.createDate(value.getTime());
                } else if (value instanceof RegExp) {
                    encodeValue(value.source);
                    encodeValue(value.flags);
                    exports.createRegExp(value.lastIndex);
                } else if (value instanceof Error) {
                    encodeStringBuffer(value.toString(), exports.createError);
                } else {
                    exports.createObject();
                    for (let key in value) {
                        encodeValue(value[key]);
                        encodeStringBuffer(key, exports.createObjectProperty);
                    }
                }

                if (reusableIndex !== undefined) {
                    reusableIndex = exports.keepValue();
                    reusableObjects.set(value, reusableIndex);
                }
                break;
            }
            case 'string':
                encodeStringBuffer(value, exports.createString);
                break;
            case 'bigint':
                encodeStringBuffer(value.toString(), exports.createBigInt);
                break;
            case 'number':
                exports.createNumber(value);
                break;
            case 'boolean':
                exports.createBoolean(value ? 1 : 0);
                break;
            case 'symbol':
                throw new Error('Cannot send Symbol to guest.');
            case 'undefined':
                exports.createUndefined();
                break;
        }
    }

    function prepareEncodingValue(value: any): void {
        if ((typeof value === 'function' || typeof value === 'object') && value !== null) {

            let currentCount = reusableObjects.get(value) || 0;
            reusableObjects.set(value, currentCount + 1);

            if (Array.isArray(value)) {
                value.forEach(x => {
                    prepareEncodingValue(x);
                });
            } else if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
                arrayBuffers.set(value, {
                    begin: 0,
                    end: value.byteLength,
                });
            } else if (typeof value.byteLength === 'number'
                && typeof value.byteOffset === 'number'
                && (value.buffer instanceof ArrayBuffer || value.buffer instanceof SharedArrayBuffer)
                && (value instanceof Int8Array || value instanceof Uint8Array
                    || value instanceof Int16Array || value instanceof Uint16Array
                    || value instanceof Int32Array || value instanceof Uint32Array
                    || value instanceof Float32Array || value instanceof Float64Array
                    || value instanceof BigInt64Array || value instanceof BigUint64Array
                    || value instanceof Uint8ClampedArray || value instanceof DataView
                )
            ) {
                let underlyingBuffer = value.buffer;
                let underlyingBufferCount = reusableObjects.get(underlyingBuffer) || 0;
                reusableObjects.set(underlyingBuffer, underlyingBufferCount + 1);
                let range = arrayBuffers.get(underlyingBuffer)
                if (!range) {
                    range = { begin: value.byteOffset, end: value.byteOffset + value.byteLength };
                    arrayBuffers.set(underlyingBuffer, range);
                }
                range.begin = Math.min(value.byteOffset, range.begin);
                range.end = Math.max(value.byteOffset + value.byteLength, range.end);
            } else if ((value instanceof Date) || (value instanceof RegExp) || (value instanceof Error)) {
                // Ignore leaf objects
            } else {
                for (let key in value) {
                    prepareEncodingValue(value[key]);
                }
            }
        }
    }

    function createGuestValue(...args: any[]) {
        exports.clearValues();
        reusableObjects.clear();
        arrayBuffers.clear();
        try {
            for (let value of args) {
                prepareEncodingValue(value);
            }
            let objectCounts = reusableObjects;
            reusableObjects = new Map<any, number>();
            for (let [obj, count] of objectCounts) {
                if (count > 1) {
                    reusableObjects.set(obj, -1);
                }
            }
            for (let value of args) {
                encodeValue(value);
            }
            if (!exports.getRecvError()) throwFromValueStack();
        } finally {
            reusableObjects.clear();
            arrayBuffers.clear();
        }
    }

    function throwFromValueStack(): never {
        if (valueStack.length > 0 && (valueStack[0] instanceof GuestError || valueStack[0] instanceof EngineError)) {
            throw valueStack[0];
        } else {
            throw new GuestError('Unknown guest error.');
        }
    }

    const importFunctions: Function[] = [];

    function registerImportsInner(callbacks: RegisterCallbacks): RegisterCallbacksIds {
        let ids: RegisterCallbacksIds = {}; // TODO: If some function is overridden by another function or null/undefined, then release old one here and on the guest by sending id=-1
        for (let name in callbacks) {
            let value = callbacks[name];
            if (typeof value === 'object') {
                ids[name] = registerImportsInner(value);
            } else if (typeof value === 'function') {
                ids[name] = importFunctions.push(value) - 1;
            }
        }
        return ids;
    }

    function call(command: SandboxCommand, ...args: any[]): any {
        createGuestValue(...args);
        if (!exports.call(command)) throwFromValueStack();
        return valueStack[0];
    }

    const sandbox: SandboxInternal = {

        imports: {
            sandbox: sandboxImports,
            wasi_snapshot_preview1: wasiImports,
        },

        init(instance: WebAssembly.Instance, options?: InstantiateOptions): void {
            exports = instance.exports as any;
            memory = exports.memory;
            refreshViews();
            wasiImports.setMemory(memory);
            startup();
            if ((options as any).__Internal__no_boot) {
                return;
            }
            sharedBufferPointer = exports.getSharedBufferPointer();
            sharedBufferSize = exports.getSharedBufferSize();
            let flags = (decoderLatin1 ? SandboxFlags.Latin1Allowed : 0)
                | (decoderUtf16 ? SandboxFlags.Utf16Allowed : 0);
            if (!exports.init(options?.maxHeapSize || 32 * 1024 * 1024, flags)) { // TODO: Add try catch for each export call. Exception from wasm indicates unrecoverable error.
                throw new Error('Sandbox initialization failed.');
            }
            sandbox.execute(bootSourceCode, { fileName: '[guest boot code]' });
        },

        execute(code: string, options?: ExecuteOptions): any {
            const fileName = options?.fileName || '[string]';
            const asModule = !!options?.asModule;
            const returnValue = !!options?.returnValue;
            const [bufferPtr, bufferSize, dealloc] = prepareCodeBuffer(code, fileName);
            valueStack.splice(0);
            const success = !!exports.execute(bufferPtr, bufferSize, sharedBufferPointer,
                (asModule ? ExecuteFlags.Module : ExecuteFlags.Script) |
                (returnValue ? ExecuteFlags.ReturnValue : 0) |
                (dealloc ? ExecuteFlags.TransferBufferOwnership : 0));
            if (!success) {
                throwFromValueStack();
            } else if (returnValue) {
                return valueStack[0];
            }
        },

        registerImports(callbacks: RegisterCallbacks): void {
            let ids = registerImportsInner(callbacks);
            call(SandboxCommand.Register, ids);
        },

        exports: {},
    }

    return sandbox;
}

