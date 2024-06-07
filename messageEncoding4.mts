
enum ContextFlags {
    Latin1Allowed = 1,
    Utf16Allowed = 2,
}

enum ExecuteFlags {
    Script = 0,
    Module = 1,
    TransferBufferOwnership = 2,
    ReturnValue = 4,
}


interface SandboxWasmExports {

    // Startup
    _start(): void;

    // Context management
    createContext(heapSizeLimit: number, flags: number): number;
    freeContext(ctxPtr: number): void;
    getSharedBufferPointer(ctxPtr: number): number; // Get shared buffer.
    getSharedBufferSize(ctxPtr: number): number;

    // Script execution
    execute(ctxPtr: number, buffer: number, size: number, flags: number): number;

    // Memory management
    memory: WebAssembly.Memory;
    malloc(ctxPtr: number, size: number): number;
    realloc(ctxPtr: number, ptr: number, oldSize: number, newSize: number): number;
    free(ctxPtr: number, ptr: number): number;

    // Value passing from host to guest

    cleanValues(ctxPtr: number): void; // Clear input values stacks.
    callError(ctxPtr: number): number; // Returns error message string pointer if values loading is in error state, NULL otherwise.
    execCall(ctxPtr: number): number; // Execute the call, returns error message string pointer if error was thrown, NULL otherwise. Using current value stack as parameters.
    // Values created by those functions puts value into the stack and can optionally pop some values.
    // All value creating functions sets error state on failure and does nothing if there is already an error state (except deallocating pointers if needed).
    createNull(ctxPtr: number): void;
    createBoolean(ctxPtr: number, value: boolean): void;
    createUndefined(ctxPtr: number): void;
    createArray(ctxPtr: number): void;
    createArrayItem(ctxPtr: number, index: number): void;
    createArrayBuffer(ctxPtr: number, ptr: number): void;
    createArrayBufferView(ctxPtr: number, type: number, byteOffset: number, byteLength: number): void;
    createDate(ctxPtr: number, time: number): void;
    createRegExp(ctxPtr: number, lastIndex: number): void;
    createError(ctxPtr: number): void;
    createObject(ctxPtr: number): void;
    createObjectProperty(ctxPtr: number): void;
    createNumber(ctxPtr: number, value: number): void;
    createBigInt(ctxPtr: number): void;
    //
    createString(ctxPtr: number, ptr: number, charLength: number, byteLength: number, bufferLength: number): void;
    // Values can be pushed
    keepValue(ctxPtr: number): number;
    reuseValue(ctxPtr: number, index: number): void;
};


interface SandboxWasmImports {
    wasi_snapshot_preview1: {
        args_get(a: number, b: number): number;
        args_sizes_get(a: number, b: number): number;
        environ_get(a: number, b: number): number;
        environ_sizes_get(a: number, b: number): number;
        clock_res_get(a: number, b: number): number;
        clock_time_get(a: number, b: bigint, c: number): number;
        random_get(a: number, b: number): number;
        fd_read(a: number, b: number, c: number, d: number): number;
        fd_write(a: number, b: number, c: number, d: number): number;
        fd_seek(a: number, b: bigint, c: number, d: number): number;
        fd_close(a: number): number;
        fd_fdstat_get(a: number, b: number): number;
        proc_exit(a: number): void;
    };
    sandbox: {
        cleanValues(): void;
        keepValue(): number;
        reuseValue(index: number): void;
        createNull(): void;
        createBoolean(value: number): void;
        createUndefined(): void;
        createArray(): void;
        createArrayItem(index: number): void;
        createArrayBuffer(ptr: number, byteLength: number): void;
        createArrayBufferView(type: number, byteOffset: number, byteLength: number): void;
        createDate(time: number): void;
        createRegExp(lastIndex: number): void;
        createError(): void;
        createObject(): void;
        createObjectProperty(): void;
        createNumber(value: number): void;
        createBigInt(): void;
        createStringLatin1(ptr: number, size: number): void;
        createStringUtf16(ptr: number, size: number): void;
        createStringUtf8(ptr: number, size: number): void;
        execCall(ctxPtr: number): number; // return 0 if error occurred, value stack has Error object, return 1 on success, value stack has returned value
    };
};

interface SandboxWasmInstance {
    exports: SandboxWasmExports;
}


export class Instance {
    private wasmInstance: SandboxWasmInstance;
    private exports: SandboxWasmExports;

    public constructor(wasmInstance: SandboxWasmInstance | WebAssembly.Instance) {
        this.wasmInstance = wasmInstance as SandboxWasmInstance;
        this.exports = this.wasmInstance.exports;
    }

    public createContext(heapSizeLimit: number): Context {
        let flags = 0;
        if (decoderLatin1) flags |= ContextFlags.Latin1Allowed;
        if (decoderUtf16) flags |= ContextFlags.Utf16Allowed;
        let ptr = this.exports.createContext(heapSizeLimit, flags);
        if (ptr === 0) {
            throw new Error('Error creating new sandbox context.');
        }
        return new Context(this, this.exports, ptr);
    }
}

export class GuestError extends Error { };

export class Context {
    private instance: Instance;
    private exports: SandboxWasmExports;
    private memory: WebAssembly.Memory;
    private ctxPtr: number;
    private bufferPtr: number;
    private bufferSize: number;

    public constructor(instance: Instance, exports: SandboxWasmExports, ptr: number) {
        this.instance = instance;
        this.exports = exports;
        this.memory = this.exports.memory;
        this.ctxPtr = ptr;
        this.bufferPtr = this.exports.getSharedBufferPointer(ptr);
        this.bufferSize = this.exports.getSharedBufferSize(ptr);
    }

    private callLowLevel(...args: any[]): any[] {
        initEncodingDecoding(memory, this.exports, this.ctxPtr, this.bufferPtr, this.bufferSize);
        for (let arg of args) {
            prepareEncodingValue(arg);
        }
        this.exports.cleanValues(this.ctxPtr);
        encodeMultipleValues(args);
        for (let arg of args) {
            encodeValue(arg);
        }
        let error = exports.callError(this.ctxPtr);
        if (error !== 0) {
            throw new Error(`Encoding parameters for guest failed: TODO: error message`);
        }
        error = exports.execCall(this.ctxPtr);
        if (error !== 0) {
            throw new GuestError(`TODO: error message`);
        }
        return valueStack;
    }
}


/* =============================== VALUES PASSING =============================== */


let exports: SandboxWasmExports;
let memory: WebAssembly.Memory;
let memArrayBuffer: ArrayBuffer;
let memByteArray: Uint8Array;
let ctxPtr: number;
let sharedBufferPtr: number;
let sharedBufferSize: number;


enum ArrayBufferViewType {
    Int8Array = 0,
    Uint8Array = 1,
    Uint8ClampedArray = 2,
    Int16Array = 3,
    Uint16Array = 4,
    Int32Array = 5,
    Uint32Array = 6,
    Float32Array = 7,
    Float64Array = 8,
    BigInt64Array = 9,
    BigUint64Array = 10,
    DataView = 11,
}

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

function initEncodingDecoding(mem: WebAssembly.Memory, exp: SandboxWasmExports, ptr: number, bufferPtr: number, bufferSize: number): void {
    memory = mem;
    memArrayBuffer = mem.buffer;
    memByteArray = new Uint8Array(memByteArray);
    exports = exp;
    ctxPtr = ptr;
    sharedBufferPtr = bufferPtr;
    sharedBufferSize = bufferSize;
}

function refreshViews() {
    if (memArrayBuffer != memory.buffer) {
        memArrayBuffer = memory.buffer;
        memByteArray = new Uint8Array(memArrayBuffer);
    }
}


/* =============================== VALUES DECODING =============================== */

function createTextDecoderIfAvailable(encoding: string): TextDecoder | undefined {
    try {
        return new TextDecoder(encoding);
    } catch (e) {
        return undefined;
    }
}

const decoderUtf8 = new TextDecoder();
const decoderLatin1 = createTextDecoderIfAvailable('latin1');
const decoderUtf16 = createTextDecoderIfAvailable('utf-16le');
const valueStack: any[] = [];
const reusableStack: any[] = [];


/* =============================== VALUES ENCODING =============================== */

const encoder = new TextEncoder();

let reusableObjects: Map<any, number>;
const arrayBuffers = new Map<ArrayBufferLike, { begin: number, end: number }>();


function mallocForEncoding(size: number): number {
    let result = exports.malloc(ctxPtr, size);
    if (result === 0) {
        throw new TypeError('Cannot encode values: sandbox out of memory.');
    }
    return result;
}

function reallocForEncoding(ptr: number, oldSize: number, newSize: number): number {
    let result = exports.realloc(ctxPtr, ptr, oldSize, newSize);
    if (result === 0) {
        exports.free(ctxPtr, ptr);
        throw new TypeError('Cannot encode values: sandbox out of memory.');
    }
    return result;
}

function encodeMultipleValues(values: any[]): void {
    reusableObjects.clear();
    arrayBuffers.clear();
    try {
        for (let value of values) {
            prepareEncodingValue(value);
        }
        let objectCounts = reusableObjects;
        reusableObjects = new Map<any, number>();
        for (let [obj, count] of objectCounts) {
            if (count > 1) {
                reusableObjects.set(obj, -1);
            }
        }
        for (let value of values) {
            encodeValue(value);
        }
    } finally {
        reusableObjects.clear();
        arrayBuffers.clear();
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
            if (value === memArrayBuffer) {
                throw new TypeError('Passing ArrayBuffer from sandbox module memory is not allowed.');
            }
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
            if (underlyingBuffer === memArrayBuffer) {
                throw new TypeError('Passing ArrayBuffer from sandbox module memory is not allowed.');
            }
            let underlyingBufferCount = reusableObjects.get(underlyingBuffer) || 0;
            reusableObjects.set(underlyingBuffer, underlyingBufferCount + 1);
            let range = arrayBuffers.get(underlyingBuffer) || {
                begin: value.byteOffset,
                end: value.byteOffset + value.byteLength,
            };
            range.begin = Math.min(value.byteOffset, range.begin);
            range.end = Math.max(value.byteOffset + value.byteLength, range.end);
        } else if (value instanceof Date) {
            // Ignore leaf object
        } else if (value instanceof RegExp) {
            // Ignore leaf object
        } else if (value instanceof Error) {
            // Ignore leaf object
        } else {
            for (let key in value) {
                prepareEncodingValue(value[key]);
            }
        }

    }
}

function encodeValue(value: any): void {
    switch (typeof value) {
        case 'function':
        case 'object': {

            if (value === null) {
                exports.createNull(ctxPtr);
                return;
            }

            let reusableIndex = reusableObjects.get(value);

            if (reusableIndex !== undefined && reusableIndex >= 0) {
                exports.reuseValue(ctxPtr, reusableIndex);
                return;
            }

            if (Array.isArray(value)) {
                exports.createArray(ctxPtr);
                value.forEach((x, i) => {
                    encodeValue(x);
                    exports.createArrayItem(ctxPtr, i);
                });
            } else if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
                let info = arrayBuffers.get(value);
                let arrPointer = mallocForEncoding(info!.end - info!.begin);
                refreshViews();
                memByteArray.set(new Uint8Array(value, info!.begin, info!.end - info!.begin), arrPointer);
                exports.createArrayBuffer(ctxPtr, arrPointer);
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
                exports.createArrayBufferView(ctxPtr, getArrayBufferViewType(value), value.byteOffset - info!.begin, value.byteLength);
            } else if (value instanceof Date) {
                exports.createDate(ctxPtr, value.getTime());
            } else if (value instanceof RegExp) {
                encodeValue(value.source);
                encodeValue(value.flags);
                exports.createRegExp(ctxPtr, value.lastIndex);
            } else if (value instanceof Error) {
                encodeValue(value.message || value.name || 'Error');
                exports.createError(ctxPtr);
            } else {
                exports.createObject(ctxPtr);
                for (let key in value) {
                    encodeValue(key);
                    encodeValue(value[key]);
                    exports.createObjectProperty(ctxPtr);
                }
            }

            if (reusableIndex !== undefined) {
                reusableIndex = exports.keepValue(ctxPtr);
                reusableObjects.set(value, reusableIndex);
            }
            break;
        }
        case 'number':
            exports.createNumber(ctxPtr, value);
            break;
        case 'bigint':
            encodeValue(value.toString());
            exports.createBigInt(ctxPtr);
            break;
        case 'string': {
            refreshViews();
            let stat = encoder.encodeInto(value, new Uint8Array(memArrayBuffer, sharedBufferPtr, sharedBufferSize));
            if (stat.read >= value.length) {
                exports.createString(ctxPtr, sharedBufferPtr, stat.read, stat.written, 0);
                return;
            }
            let firstSize = 2 * value.length;
            let strBufferPtr = mallocForEncoding(firstSize);
            refreshViews();
            stat = encoder.encodeInto(value, new Uint8Array(memArrayBuffer, strBufferPtr, firstSize));
            if (stat.read >= value.length) {
                exports.createString(ctxPtr, strBufferPtr, stat.read, stat.written, firstSize);
                return;
            }
            let remaining = value.length - stat.read;
            let fullSize = stat.written + 3 * remaining;
            strBufferPtr = reallocForEncoding(strBufferPtr, firstSize, fullSize);
            refreshViews();
            let stat2 = encoder.encodeInto(value.substring(stat.read), new Uint8Array(memArrayBuffer, strBufferPtr + stat.written, fullSize - stat.written));
            exports.createString(ctxPtr, strBufferPtr, stat2.read + stat.read, stat2.written + stat.written, fullSize);
            break;
        }
        case 'boolean':
            exports.createBoolean(ctxPtr, value);
            break;
        case 'symbol':
        case 'undefined':
        default:
            exports.createUndefined(ctxPtr);
            break;
    }
}
