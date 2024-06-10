import { GuestSandboxObject, ArrayBufferViewType } from './common';

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
                s.createArrayBufferView(getArrayBufferViewType(value), value.byteOffset - info!.begin, value.byteLength);
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
            let range = arrayBuffers.get(underlyingBuffer) || {
                begin: value.byteOffset,
                end: value.byteOffset + value.byteLength,
            };
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
