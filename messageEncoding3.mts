
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


interface SandboxWasmModuleExports {
    malloc(ctxPtr: number, size: number): number;
    realloc(ctxPtr: number, ptr: number, oldSize: number, newSize: number): number;
    free(ctxPtr: number, ptr: number): number;

    // Value passing from host to guest

    initCall(ctxPtr: number): void; // Clear input values stacks.
    getSharedBufferPointer(ctxPtr: number): number; // Get shared buffer.
    getSharedBufferSize(ctxPtr: number): number;
    callError(ctxPtr: number): number; // Returns error message string pointer if values loading is in error state, NULL otherwise.
    execCall(ctxPtr: number): number; // Execute the call, returns error message string pointer if error was thrown, NULL otherwise. Using current value stack as parameters.
    // Values created by those functions puts value into the stack and can optionally pop some values.
    // All value creating functions sets error state on failure and does nothing if there is already an error state (except deallocating pointers if needed).
    createNull(ctxPtr: number): void;
    createBoolean(ctxPtr: number, value: boolean): void;
    createUndefined(ctxPtr: number): void;
    createArray(ctxPtr: number): void;
    setArrayItem(ctxPtr: number, index: number): void;
    createArrayBuffer(ctxPtr: number, ptr: number): void;
    createArrayBufferView(ctxPtr: number, type: number, byteOffset: number, byteLength: number): void;
    createDate(ctxPtr: number, time: number): void;
    createRegExp(ctxPtr: number, lastIndex: number): void;
    createError(ctxPtr: number): void;
    createObject(ctxPtr: number): void;
    setObjectProperty(ctxPtr: number): void;
    createNumber(ctxPtr: number, value: number): void;
    createBigInt(ctxPtr: number): void;
    //
    createString(ctxPtr: number, ptr: number, charLength: number, byteLength: number, bufferLength: number): void;
    // Values can be pushed
    keepValue(ctxPtr: number): number;
    reuseValue(ctxPtr: number, index: number): void;
};

class DataInput {
    public valueStack: any[] = [];
    public reusableStack: any[] = [];

    initCall(): void {
        this.valueStack = [];
        this.reusableStack = [];
    }

    createNull(): void {
        this.valueStack.push(null);
    }

    createBoolean(value: number): void {
        this.valueStack.push(value === 0 ? false : true);
    }

    createUndefined(): void {
        this.valueStack.push(undefined);
    }

    createArray(): void {
        this.valueStack.push([]);
    }

    setArrayItem(index: number): void {
        let arr = this.valueStack.at(-2);
        arr[index] = this.valueStack.pop();
    }

    createArrayBuffer(ptr: number, byteLength: number): void {
        this.valueStack.push(buffer.slice(ptr, ptr + byteLength));
    }

    createArrayBufferView(type: number, byteOffset: number, byteLength: number): void {
        let buffer = this.valueStack.pop();
        let obj: ArrayBufferView;
        switch (type) {
            default:
            case ObjectTypeId.Int8Array: obj = new Int8Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Uint8Array: obj = new Uint8Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Uint8ClampedArray: obj = new Uint8ClampedArray(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Int16Array: obj = new Int16Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Uint16Array: obj = new Uint16Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Int32Array: obj = new Int32Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Uint32Array: obj = new Uint32Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Float32Array: obj = new Float32Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.Float64Array: obj = new Float64Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.BigInt64Array: obj = new BigInt64Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.BigUint64Array: obj = new BigUint64Array(buffer, byteOffset, byteLength); break;
            case ObjectTypeId.DataView: obj = new DataView(buffer, byteOffset, byteLength); break;
        }
        this.valueStack.push(obj);
    }

    createDate(time: number): void {
        this.valueStack.push(new Date(time));
    }

    createRegExp(lastIndex: number): void {
        let flags = this.valueStack.pop();
        let source = this.valueStack.pop();
        let obj = new RegExp(source, flags);
        obj.lastIndex = lastIndex;
        this.valueStack.push(obj);
    }

    createError(): void {
        let message = this.valueStack.pop();
        this.valueStack.push(new Error(message));
    }

    createObject(): void {
        this.valueStack.push({});
    }

    setObjectProperty(): void {
        let obj = this.valueStack.at(-3);
        let value = this.valueStack.pop();
        let key = this.valueStack.pop();
        obj[key] = value;
    }

    createNumber(value: number): void {
        this.valueStack.push(value);
    }

    createBigInt(): void {
        let text = this.valueStack.pop();
        this.valueStack.push(BigInt(text));
    }

    createStringLatin1(ptr: number, size: number): void {
        this.valueStack.push(decoderLatin1.decode(new Uint8Array(buffer, ptr, size)));
    }

    createStringUtf16(ptr: number, size: number): void {
        this.valueStack.push(decoderUtf16.decode(new Uint8Array(buffer, ptr, size)));
    }

    createStringUtf8(ptr: number, size: number): void {
        this.valueStack.push(decoderUtf8.decode(new Uint8Array(buffer, ptr, size)));
    }

    keepValue(): number {
        let index = this.reusableStack.length;
        this.reusableStack.push(this.valueStack.at(-1));
        return index;
    }

    reuseValue(index: number): void {
        this.valueStack.push(this.reusableStack[index]);
    }

}

let exports: SandboxWasmModuleExports;

class SandboxContext {
    public ptr: number;
    public memory: WebAssembly.Memory;
    public sharedBufferPtr: number;
    public sharedBufferSize: number;
    public allocSharedBuffer() { }
}

let context: SandboxContext;
let buffer: ArrayBuffer;
let view: DataView;
let byteArray: Uint8Array;
let pointer: number;
let end: number;
let allocatedBuffers: number[];
const objectOffsets = new Map<any, { index: number, pointer: number }>();
const visitedObjects = new Set<any>();
const arrayBuffers = new Map<ArrayBufferLike, { begin: number, end: number }>();


function refreshViews() {
    if (buffer != context.memory.buffer) {
        buffer = context.memory.buffer;
        view = new DataView(buffer);
        byteArray = new Uint8Array(buffer);
    }
}

let ctxPtr: number;

enum ObjectTypeId {
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

function arrayBufferViewValue(input: any): ObjectTypeId {
    if (input instanceof Int8Array) return ObjectTypeId.Int8Array;
    if (input instanceof Uint8Array) return ObjectTypeId.Uint8Array;
    if (input instanceof Uint8ClampedArray) return ObjectTypeId.Uint8ClampedArray;
    if (input instanceof Int16Array) return ObjectTypeId.Int16Array;
    if (input instanceof Uint16Array) return ObjectTypeId.Uint16Array;
    if (input instanceof Int32Array) return ObjectTypeId.Int32Array;
    if (input instanceof Uint32Array) return ObjectTypeId.Uint32Array;
    if (input instanceof Float32Array) return ObjectTypeId.Float32Array;
    if (input instanceof Float64Array) return ObjectTypeId.Float64Array;
    if (input instanceof BigInt64Array) return ObjectTypeId.BigInt64Array;
    if (input instanceof BigUint64Array) return ObjectTypeId.BigUint64Array;
    if (input instanceof DataView) return ObjectTypeId.DataView;
    return ObjectTypeId.Uint8Array;
}

let reusableObjects = new Map<any, number>();

function malloc(size: number): number {
    let result = exports.malloc(ctxPtr, size);
    if (result === 0) {
        throw new TypeError('Sandbox out of memory.');
    }
    return result;
}

function realloc(ptr: number, oldSize: number, newSize: number): number {
    let result = exports.realloc(ctxPtr, ptr, oldSize, newSize);
    if (result === 0) {
        exports.free(ctxPtr, ptr);
        throw new TypeError('Sandbox out of memory.');
    }
    return result;
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
                    exports.setArrayItem(ctxPtr, i);
                });
            } else if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
                let info = arrayBuffers.get(value);
                let arrPointer = malloc(info!.end - info!.begin);
                refreshViews();
                byteArray.set(new Uint8Array(value, info!.begin, info!.end - info!.begin), arrPointer);
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
                if (underlyingBuffer === buffer) {
                    throw new TypeError('Passing ArrayBuffer from sandbox module memory is not allowed.'); // TODO Move to preprocessing
                }
                let info = arrayBuffers.get(underlyingBuffer);
                encodeValue(underlyingBuffer);
                exports.createArrayBufferView(ctxPtr, arrayBufferViewValue(value), value.byteOffset - info!.begin, value.byteLength);
            } else if (value instanceof Date) {
                exports.createDate(ctxPtr, value.getTime());
            } else if (value instanceof RegExp) {
                encodeValue(value.source);
                encodeValue(value.flags);
                exports.createRegExp(ctxPtr, value.lastIndex);
            } else if (value instanceof Error) {
                encodeValue(value.message || value.name);
                exports.createError(ctxPtr);
            } else {
                exports.createObject(ctxPtr);
                for (let key in value) {
                    encodeValue(key);
                    encodeValue(value[key]);
                    exports.setObjectProperty(ctxPtr);
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
            let stat = encoder.encodeInto(value, new Uint8Array(buffer, sharedBufferPtr, sharedBufferSize));
            if (stat.read >= value.length) {
                exports.createString(ctxPtr, sharedBufferPtr, stat.read, stat.written, 0);
                return;
            }
            let firstSize = 2 * value.length;
            let strBuffer = malloc(firstSize);
            refreshViews();
            stat = encoder.encodeInto(value, new Uint8Array(buffer, strBuffer, firstSize));
            if (stat.read >= value.length) {
                exports.createString(ctxPtr, strBuffer, stat.read, stat.written, firstSize);
                return;
            }
            let remaining = value.length - stat.read;
            let fullSize = stat.written + 3 * remaining;
            strBuffer = realloc(strBuffer, firstSize, fullSize);
            refreshViews();
            let stat2 = encoder.encodeInto(value.substring(stat.read), new Uint8Array(buffer, strBuffer + stat.written, fullSize - stat.written));
            exports.createString(ctxPtr, strBuffer, stat2.read + stat.read, stat2.written + stat.written, fullSize);
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

let dataInput: DataInput;

function exampleCallGuest(ctx: SandboxContext, arg1: any, arg2: any, arg3: any): any {
    exports.initCall(ctx.ptr);
    encodeValue(arg1);
    encodeValue(arg2);
    encodeValue(arg3);
    let error = exports.callError(ctx.ptr);
    if (error !== 0) {
        // TODO Throw exception
    }
    error = exports.execCall(ctx.ptr);
    if (error !== 0) {
        // TODO Throw exception
    }
    return dataInput.valueStack[0];
}

///// EXAMPLE OF EXCHANGING FUNCTIONS (it is symmetrical):

function setGuestImportsOnHostSide(ctx: SandboxContext) {
    ctx.registerImports({
        sys: {
            console: {
                log: logFunction,
                error: errorFunction,
                warn: warnFunction,
            }
        }
    });
    /*
    ctx.registerImports() will merge existing imports with new ones. It will reproduce its content on the guest side.
    */
    ctx.exports.user.execute(params);
    /*
    calling reproduced function will encode parameters and its uid (index in some array), send encoded parameters to the host,
    host will find matching function in array based on uid and call it.
    Removing imported function will also be reproduced on guest side. Functions from array will be also removed based on uid.
    The host knows uid during removing (e.g. internally, it holds the same objects structure, but with uids instead of functions),
    so it sends it to the guest.
    */
}

function setGuestExportsOnGuestSide() {
    //import * as sandbox from ':sandbox';
    sandbox.registerExports({
        user: {
            execute: executeUserCode,
        }
    });
    /*
    ctx.registerExports() will merge existing exports with new ones. It will reproduce its content on the host side.
    */
    sandbox.exports.sys.console.log('Some log message.');
}