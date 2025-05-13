
enum Tag {
    EndOfChunk = 0, // Follows next chunk pointer or NULL if end of data
    Null = 1,
    Number = 2,
    Undefined = 3,
    True = 4,
    False = 5,
    Array = 6,
    String = 7,
    StringBuffer = 8,
    BigInt = 9,
    BigIntBuffer = 10,
    Object = 11,
    Date = 12,
    RegExp = 13,
    Error = 14,
    Ref = 15,
    CachedFlag = 0x80,
    ArrayBuffer,
}

const MINIMAL_REQUIRED_SPACE = 9; // Minimum of all "Required space" comments below
const MINIMAL_SIZE_BEFORE_ENCODING = 5 + MINIMAL_REQUIRED_SPACE;
const DEFAULT_CHUNK_SIZE = 4 * 1024;

const encoder = new TextEncoder();

class SandboxContext {
    public memory: WebAssembly.Memory;
    public sharedBufferPtr: number;
    public sharedBufferSize: number;
    public allocSharedBuffer() { }
}

let context: SandboxContext;
let buffer: ArrayBuffer
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

function encode(ctx: SandboxContext, value: any): void {
    context = ctx;
    context.allocSharedBuffer();
    refreshViews();
    pointer = context.sharedBufferPtr;
    end = pointer + context.sharedBufferSize;
    objectOffsets.clear();
    visitedObjects.clear();
    allocatedBuffers = [];
    try {
        preprocessValue(value);
        encodeValue(value);
    } finally {
        for (let ptr of allocatedBuffers) {
            context.free(ptr);
        }
    }
}

function preprocessValue(value: any): void {
    if (typeof value === 'function' || typeof value === 'object') {
        if (value === null || visitedObjects.has(value)) {
            return;
        }
        visitedObjects.add(value);
        if (Array.isArray(value)) {
            value.forEach(x => {
                preprocessValue(x);
            });
        } else if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
            let info = arrayBuffers.get(value);
            if (info !== undefined) {
                info!.begin = 0;
                info!.end = value.byteLength;
            } else {
                arrayBuffers.set(value, {
                    begin: 0,
                    end: value.byteLength,
                });
            }
        } else if (typeof value.byteLength === 'number'
            && typeof value.byteOffset === 'number'
            && (value.buffer instanceof ArrayBuffer || value.buffer instanceof SharedArrayBuffer)
            && (
                value instanceof Int8Array
                || value instanceof Uint8Array
                || value instanceof Uint8ClampedArray
                || value instanceof Int16Array
                || value instanceof Uint16Array
                || value instanceof Int32Array
                || value instanceof Uint32Array
                || value instanceof Float32Array
                || value instanceof Float64Array
                || value instanceof BigInt64Array
                || value instanceof BigUint64Array
                || value instanceof DataView
            )
        ) {
            let underlyingBuffer = value.buffer;
            if (underlyingBuffer === buffer) {
                throw new TypeError('Passing ArrayBuffer from sandbox module memory is not allowed.');
            }
            let info = arrayBuffers.get(underlyingBuffer);
            if (info !== undefined) {
                info!.begin = Math.min(info!.begin, value.byteOffset);
                info!.end = Math.max(info!.end, value.byteOffset + value.byteLength);
            } else {
                arrayBuffers.set(underlyingBuffer, {
                    begin: value.byteOffset,
                    end: value.byteOffset + value.byteLength,
                });
            }
        } else if (value instanceof Date
            || value instanceof RegExp
            || value instanceof Error
        ) {
            // Leaf object - ignore
        } else {
            for (let key in value) {
                preprocessValue(value[key]);
            }
        }
    }
}

function encodeValue(value: any): void {
    let tag: Tag | undefined = undefined;
    if (end - pointer < MINIMAL_SIZE_BEFORE_ENCODING) {
        let newPointer = context.alloc(DEFAULT_CHUNK_SIZE); // TODO: failed alloc should throw error
        refreshViews();
        allocatedBuffers.push(newPointer);
        view.setUint8(pointer++, Tag.EndOfChunk);
        view.setUint32(pointer, newPointer, true);
        pointer += 4;
        pointer = newPointer;
        end = pointer + DEFAULT_CHUNK_SIZE;
    }
    switch (typeof value) {
        case 'function':
        case 'object':

            if (value === null) {
                view.setUint8(pointer++, Tag.Null);
                // Required space: 1
                break;
            }

            if (objectOffsets.has(value)) {
                view.setUint8(pointer++, Tag.Ref);
                let info = objectOffsets.get(value);
                view.setUint8(info!.pointer, view.getUint8(info!.pointer) | Tag.CachedFlag);
                view.setUint32(pointer, info!.index, true);
                pointer = + 4;
                // Required space: 5
                break;
            }

            objectOffsets.set(value, { pointer, index: objectOffsets.size });

            if (Array.isArray(value)) {
                view.setUint8(pointer++, Tag.Array);
                let headerOffset = pointer;
                pointer += 4;
                let count = 0;
                value.forEach((x, i) => {
                    view.setUint32(pointer, i, true);
                    pointer += 4;
                    // Required space: 9
                    encodeValue(x);
                    count++;
                });
                view.setUint32(headerOffset, count, true);
                break;
            } else if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
                let info = arrayBuffers.get(value);
                view.setUint8(pointer++, Tag.ArrayBuffer);
                let arrPointer = context.alloc(info!.end - info!.begin);
                allocatedBuffers.push(arrPointer);
                refreshViews();
                view.setInt32(pointer, arrPointer, true);
                byteArray.set(new Uint8Array(value, info!.begin, info!.end - info!.begin), arrPointer);
                pointer += 4;
            } else if (typeof value.byteLength === 'number'
                && typeof value.byteOffset === 'number'
                && (value.buffer instanceof ArrayBuffer || value.buffer instanceof SharedArrayBuffer)
                && (
                    value instanceof Int8Array
                    || value instanceof Uint8Array
                    || value instanceof Uint8ClampedArray
                    || value instanceof Int16Array
                    || value instanceof Uint16Array
                    || value instanceof Int32Array
                    || value instanceof Uint32Array
                    || value instanceof Float32Array
                    || value instanceof Float64Array
                    || value instanceof BigInt64Array
                    || value instanceof BigUint64Array
                    || value instanceof DataView
                )
            ) {
                let underlyingBuffer = value.buffer;
                if (underlyingBuffer === buffer) {
                    throw new TypeError('Passing ArrayBuffer from sandbox module memory is not allowed.');
                }
                let info = arrayBuffers.get(underlyingBuffer);
                if (info !== undefined) {
                    info!.begin = Math.min(info!.begin, value.byteOffset);
                    info!.end = Math.max(info!.end, value.byteOffset + value.byteLength);
                } else {
                    arrayBuffers.set(underlyingBuffer, {
                        index: arrayBuffers.size,
                        begin: value.byteOffset,
                        end: value.byteOffset + value.byteLength,
                    });
                }
            } else if (value instanceof Date) {
                view.setUint8(pointer++, Tag.Date);
                view.setFloat64(pointer, value.getTime(), true);
                pointer += 8;
                // Required space: 9
            } else if (value instanceof RegExp) {
                view.setUint8(pointer++, Tag.RegExp);
                view.setInt32(pointer, value.lastIndex, true);
                pointer += 4;
                // Required space: 5
                encodeValue(value.source);
                encodeValue(value.flags);
            } else if (value instanceof Error) {
                view.setUint8(pointer++, Tag.Error);
                // Required space: 1
                encodeValue(value.message || value.name);
            } else {
                view.setUint8(pointer++, Tag.Object);
                let headerOffset = pointer;
                pointer += 4;
                let count = 0;
                for (let key in value) {
                    // Required space: 5
                    encodeValue(key);
                    encodeValue(value[key]);
                    count++;
                }
                view.setUint32(headerOffset, count, true);
            }
            break;
        case 'number':
            view.setUint8(pointer++, Tag.Number);
            view.setFloat64(pointer, value, true);
            pointer += 8;
            // Required space: 9
            break;
        case 'bigint':
            tag = Tag.BigInt;
            value = value.toString();
        // no break - fall through string encoding
        case 'string': {
            tag = tag || Tag.String;
            view.setUint8(pointer++, tag);
            let headerOffset = pointer;
            pointer += 4;
            let stat = encoder.encodeInto(value, new Uint8Array(buffer, pointer, end - pointer));
            if (stat.read >= value.length) {
                pointer += stat.written;
                view.setUint32(headerOffset, stat.written, true);
                break;
            }
            view.setUint8(headerOffset - 1, tag + 1);
            pointer += 4;
            // Required space: 9
            let firstSize = tag == Tag.BigInt ? value.length : 2 * value.length;
            let strBuffer = context.alloc(firstSize);
            refreshViews();
            allocatedBuffers.push(strBuffer);
            stat = encoder.encodeInto(value, strBuffer);
            if (stat.read >= value.length) {
                view.setUint32(headerOffset, stat.written, true);
                view.setUint32(headerOffset + 4, strBuffer, true);
                break;
            }
            let remaining = value.length - stat.read;
            strBuffer = context.realloc(strBuffer, firstSize, 2 * value.length + 3 * remaining);
            refreshViews();
            allocatedBuffers[allocatedBuffers.length - 1] = strBuffer;
            stat = encoder.encodeInto(value, strBuffer);
            view.setUint32(headerOffset, stat.written, true);
            view.setUint32(headerOffset + 4, strBuffer, true);
            break;
        }
        case 'boolean':
            view.setUint8(pointer++, value ? Tag.True : Tag.False);
            // Required space: 1
            break;
        case 'symbol':
        case 'undefined':
        default:
            view.setUint8(pointer++, Tag.Undefined);
            // Required space: 1
            break;
    }
}
