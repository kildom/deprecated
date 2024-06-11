import { GuestSandboxObject, ArrayBufferViewType, SandboxCommand, RegisterCallbacks } from './common';

if (!globalThis.SharedArrayBuffer) {
    (globalThis as any).SharedArrayBuffer = ArrayBuffer;
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

const recv = __sandbox__.recv;
const s: GuestSandboxObject = __sandbox__;
let reusableObjects = new Map<any, number>();
const arrayBuffers = new Map<ArrayBufferLike, { begin: number, end: number }>();

function encodeValue(value: any): void {
    switch (typeof value) {
        case 'object':
        case 'function': {
            if (value === null) {
                s.createNull();
                return;
            }

            let reusableIndex = reusableObjects.get(value);

            if (reusableIndex !== undefined && reusableIndex >= 0) {
                s.reuseValue(reusableIndex);
                return;
            }

            if (Array.isArray(value)) {
                s.createArray();
                value.forEach((x, i) => {
                    encodeValue(x);
                    s.createArrayItem(i);
                });
            } else if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
                let info = arrayBuffers.get(value);
                s.createArrayBuffer(value, info!.begin, info!.end - info!.begin);
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
                s.createArrayBufferView(getArrayBufferViewType(value), value.byteOffset - info!.begin, length);
            } else if (value instanceof Date) {
                s.createDate(value.getTime());
            } else if (value instanceof RegExp) {
                encodeValue(value.source);
                encodeValue(value.flags);
                s.createRegExp(value.lastIndex);
            } else if (value instanceof Error) {
                s.createError(value);
            } else {
                s.createObject();
                for (let key in value) {
                    encodeValue(value[key]);
                    s.createObjectProperty(key);
                }
            }

            if (reusableIndex !== undefined) {
                reusableIndex = s.keepValue();
                reusableObjects.set(value, reusableIndex);
            }
            break;
        }
        case 'string':
            s.createString(value);
            break;
        case 'bigint':
            s.createBigInt(value.toString());
            break;
        case 'number':
            s.createNumber(value);
            break;
        case 'boolean':
            s.createBoolean(value);
            break;
        case 'symbol':
            throw new Error('Cannot send Symbol to host.');
        case 'undefined':
            s.createUndefined();
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

__sandbox__.createHostValue = function (...args: any[]) {
    s.clearValues();
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
    } finally {
        reusableObjects.clear();
        arrayBuffers.clear();
    }
};

const valueStack: any[] = [];
const reusableStack: any[] = [];
let errorState: any = undefined;

class HostError extends Error { }

type RegisterCallbacksIds = { [key: string]: number | RegisterCallbacksIds };

const imports: RegisterCallbacks = {};

__sandbox__.imports = imports;

function createImportWrapper(number: number): Function {
    return function(...args: any[]): any {
        __sandbox__.createHostValue?.(...args);
        if (!__sandbox__.callToHost(number)) {
            if (valueStack[0] instanceof Error) {
                throw valueStack[0];
            } else {
                throw new Error('Unknown error.');
            }
        }
        return valueStack[0];
    }
}

function registerImports(branch: RegisterCallbacks, ids: RegisterCallbacksIds) {
    for (let name in ids) {
        let value = ids[name];
        if (typeof value === 'object') {
            if (typeof branch[name] !== 'object') {
                branch[name] = {};
            }
            registerImports(branch[name] as any, value);
        } else if (typeof value === 'number') {
            branch[name] = createImportWrapper(value);
        }
    }
}

__sandbox__.callFromHost = function (command: number): any {
    switch (command) {
        case SandboxCommand.Register:
            registerImports(imports, valueStack[0]);
            break;
        default: {
            let func = exportFunctions[command];
            if (!func) {
                throw new Error('Invalid command id.');
            }
            return func(...valueStack);
        }
    }
}

const exportFunctions: Function[] = [];

function registerExportsInner(callbacks: RegisterCallbacks): RegisterCallbacksIds
{
    let ids: RegisterCallbacksIds = {}; // TODO: If some function is overridden by another function or null/undefined, then release old one here and on the guest by sending id=-1
    for (let name in callbacks) {
        let value = callbacks[name];
        if (typeof value === 'object') {
            ids[name] = registerExportsInner(value);
        } else if (typeof value === 'function') {
            ids[name] = exportFunctions.push(value) - 1;
        }
    }
    return ids;
}

function call(command: SandboxCommand, ...args: any[]): any {
    __sandbox__.createHostValue?.(...args);
    if (!__sandbox__.callToHost(command)) {
        if (valueStack[0] instanceof Error) {
            throw valueStack[0];
        } else {
            throw new Error('Unknown error.');
        }
    }
    return valueStack[0];
}

__sandbox__.registerExports = function(callbacks: RegisterCallbacks): void {
    let ids = registerExportsInner(callbacks);
    call(SandboxCommand.Register, ids);
},

recv.clearValues = function () {
    errorState = undefined;
    valueStack.splice(0);
    reusableStack.splice(0);
};

recv.getRecvError = function () {
    return errorState;
}

recv.createNull = function (): void {
    if (errorState) return;
    valueStack.push(null);
};

recv.createUndefined = function (): void {
    if (errorState) return;
    valueStack.push(undefined);
};

recv.createError = function (message: string): void {
    if (errorState) return;
    valueStack.push(new HostError(message));
};

recv.createArray = function (): void {
    if (errorState) return;
    valueStack.push([]);
};

recv.createObject = function (): void {
    if (errorState) return;
    valueStack.push({});
};

recv.createBigInt = function (value: string): void {
    if (errorState) return;
    valueStack.push(BigInt(value));
};

recv.createNumber = function (num: number): void {
    if (errorState) return;
    valueStack.push(num);
};

recv.createDate = function (num: number): void {
    if (errorState) return;
    try {
        valueStack.push(new Date(num));
    } catch (error) {
        errorState = error;
    }
};

recv.createRegExp = function (lastIndex: number): void {
    if (errorState) return;
    try {
        let flags = valueStack.pop();
        let source = valueStack.pop();
        let result = new RegExp(source, flags);
        result.lastIndex = lastIndex;
        valueStack.push(result);
    } catch (error) {
        errorState = error;
    }
};

recv.createArrayItem = function (index: number): void {
    if (errorState) return;
    try {
        let value = valueStack.pop();
        let array = valueStack.at(-1);
        array[index] = value;
    } catch (error) {
        errorState = error;
    }
};

recv.createString = function (value: string): void {
    if (errorState) return;
    valueStack.push(value);
};

recv.createObjectProperty = function (name: string): void {
    if (errorState) return;
    try {
        let value = valueStack.pop();
        let obj = valueStack.at(-1);
        obj[name] = value;
    } catch (error) {
        errorState = error;
    }
};

recv.createBoolean = function (value: boolean): void {
    if (errorState) return;
    valueStack.push(value);
};

recv.keepValue = function (): number {
    if (errorState) return 0;
    try {
        let index = reusableStack.length;
        reusableStack.push(valueStack.at(-1));
        return index;
    } catch (error) {
        errorState = error;
        return 0;
    }
};

recv.reuseValue = function (index: number): void {
    if (errorState) return;
    try {
        valueStack.push(reusableStack[index]);
    } catch (error) {
        errorState = error;
    }
};

recv.createArrayBuffer = function (value: ArrayBuffer) {
    if (errorState) return;
    valueStack.push(value);
};

recv.createArrayBufferView = function (type: number, offset: number, size: number) {
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
        errorState = error;
    }
}

