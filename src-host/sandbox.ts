import { SandboxWasmExport, SandboxWasmImport, SandboxWasmImportModule } from "./wasm-interface";
import { createWasiImports } from "./wasi-stubs";
import { ArrayBufferViewType } from "../src-guest/common";
import bootSourceCode from "./src-guest-boot";


//#region ------------------ Public interface


export class GuestError extends Error {
    constructor(message: string, public guestName?: string, public guestStack?: string) {
        super(message);
    }
}

export class EngineError extends Error { }

export interface InstantiateOptions {
    maxHeapSize?: number;
    // TODO: maxMessageEstimatedSize?: number;
};

export interface ExecuteOptions {
    fileName?: string;
    asModule?: boolean;
    returnValue?: boolean;
};


export interface Sandbox {
    execute(code: string, options?: ExecuteOptions): any;
};

type ModuleSourceType = WebAssembly.Module | BufferSource | Response | Request | string | URL;

let moduleState: 'empty' | 'loading' | 'loaded' | Error = 'empty';
let module: WebAssembly.Module | undefined = undefined;

export async function setSandboxModule(source: ModuleSourceType | PromiseLike<ModuleSourceType> | undefined): Promise<undefined | Error> {
    module = source as any; // TODO: Other types of sources
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
    return sandbox;
}


//#endregion


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
                        return new Uint8Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Int8Array:
                        return new Int8Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Uint8ClampedArray:
                        return new Uint8ClampedArray(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Int16Array:
                        return new Int16Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Uint16Array:
                        return new Uint16Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Int32Array:
                        return new Int32Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Uint32Array:
                        return new Uint32Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Float32Array:
                        return new Float32Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.Float64Array:
                        return new Float64Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.BigInt64Array:
                        return new BigInt64Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.BigUint64Array:
                        return new BigUint64Array(valueStack.pop(), offset, size);
                    case ArrayBufferViewType.DataView:
                        return new DataView(valueStack.pop(), offset, size);
                }
            } catch (error) {
                errorState = error?.message || error?.name || error?.toString?.() || 'Error';
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
                if (valueStack.length > 0 && (valueStack[0] instanceof GuestError || valueStack[0] instanceof EngineError)) {
                    throw valueStack[0];
                } else {
                    throw new GuestError('Unknown guest error.');
                }
            } else if (returnValue) {
                return valueStack[0];
            }
        }
    }

    return sandbox;
}

