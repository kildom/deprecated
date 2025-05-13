
/*
Serialized object structure:
{
    v: any, - serialized value
    r: (object|array)[], - reusable objects
    b: {
        o: number, - offset that must be subtracted from offsets in the objects referencing this buffer
        v: number[], - data bytes
    }[]; - table ot array buffers
}

JS TYPE         R   SERIALIZED TYPE
----------------------------------------
null            -   null
boolean         -   boolean
number          -   number
string          -   string
undefined       -   object[u]
bigint          -   object[b] v: string
Date            R   object[d] v: number
RegExp          R   object[x] s: string, f: string, l: number
Error           R   object[e] n: string, m: string, s: string
ArrayBuffer     R   object[A] b: number
TypedArray      R   object[T] t: type, b: number, o: number, l: number
array(holes)    R   array 0: object[a], 1...: [index, value]
array(simple)   R   array
object          R   object
symbol          -   N/A
[reference]     -   object[r] i: number (index in reusable objects table)

Where:
    R - can be reusable
    object[?] ... - short for object { __SaNdBoX_TYpe_: '?', ... };
*/


let reuseMap = new Map<any, number>();
let reuseTable: any[] = [];
let arrayBuffersMap = new Map<ArrayBuffer | SharedArrayBuffer, { index: number, begin: number, end: number }>();
let arrayBuffersTable: ArrayBuffer[] = [];

export enum ArrayBufferViewType {
    Int8Array = 1,
    Uint8Array = 2,
    Int16Array = 3,
    Uint16Array = 4,
    Int32Array = 5,
    Uint32Array = 6,
    Float32Array = 7,
    Float64Array = 8,
    Uint8ClampedArray = 9,
    DataView = 10,
    BigInt64Array = 11,
    BigUint64Array = 12,
}

function getArrayBufferViewType(value: any): ArrayBufferViewType | undefined {
    if (value instanceof Int8Array) return ArrayBufferViewType.Int8Array;
    if (value instanceof Uint8Array) return ArrayBufferViewType.Uint8Array;
    if (value instanceof Int16Array) return ArrayBufferViewType.Int16Array;
    if (value instanceof Uint16Array) return ArrayBufferViewType.Uint16Array;
    if (value instanceof Int32Array) return ArrayBufferViewType.Int32Array;
    if (value instanceof Uint32Array) return ArrayBufferViewType.Uint32Array;
    if (value instanceof Float32Array) return ArrayBufferViewType.Float32Array;
    if (value instanceof Float64Array) return ArrayBufferViewType.Float64Array;
    if (value instanceof Uint8ClampedArray) return ArrayBufferViewType.Uint8ClampedArray;
    if (value instanceof DataView) return ArrayBufferViewType.DataView;
    if (globalThis.BigInt64Array && value instanceof globalThis.BigInt64Array) return ArrayBufferViewType.BigInt64Array;
    if (globalThis.BigUint64Array && value instanceof globalThis.BigUint64Array) return ArrayBufferViewType.BigUint64Array;
    return undefined;
}

function prepare(value: any) {
    let type = typeof value;

    if ((type === 'function' || type === 'object') && value !== null) {

        let index = reuseMap.get(value);
        if (index === undefined) {
            // First time we see this value - mark as seen and walk through it
            reuseMap.set(value, -1);
            if (Array.isArray(value)) {
                value.forEach(prepare);
            } else if ((value instanceof Date) || (value instanceof RegExp) || (value instanceof Error)) {
                // Ignore leaf objects
            } else {
                for (let key in value) {
                    prepare(value[key]);
                }
            }
        } else if (index === -1) {
            // Second time we see this value - make it reusable
            reuseMap.set(value, reuseTable.length);
            reuseTable.push(value);
        }
    }
}

function arrayHasHoles(array: any[]) {
    let result = false;
    let i = 0;
    array.forEach((_v, index) => {
        if (index !== i) {
            result = true;
        }
        i = index + 1;
    });
    return result;
}

function serializeValue(value: any, allowReuse: boolean): any {

    switch (typeof value) {
        case 'boolean':
        case 'number':
        case 'string':
            return value;

        case 'undefined':
            return { __SaNdBoX_TYpe_: 'u' };

        case 'bigint':
            return { __SaNdBoX_TYpe_: 'b', v: value.toString() };

        case 'object':
        case 'function': {

            let viewType: ArrayBufferViewType | undefined;

            if (value === null) {
                return null;
            }

            if (allowReuse) {
                let index = reuseMap.get(value)!;
                if (index >= 0) {
                    return { __SaNdBoX_TYpe_: 'r', i: index };
                }
            }

            if (value instanceof Date) {

                return { __SaNdBoX_TYpe_: 'd', v: value.getTime() };

            } else if (value instanceof RegExp) {

                return {
                    __SaNdBoX_TYpe_: 'x',
                    s: value.source,
                    f: value.flags,
                    l: value.lastIndex,
                };

            } else if (value instanceof Error) {

                let res = {
                    __SaNdBoX_TYpe_: 'e',
                    n: value.name,
                    m: value.message,
                } as any;
                if (value.stack) {
                    res.s = value.stack;
                }
                return res;

            } else if (value instanceof ArrayBuffer || (globalThis.SharedArrayBuffer && value instanceof globalThis.SharedArrayBuffer)) {

                let index: number;
                if (arrayBuffersMap.has(value)) {
                    let info = arrayBuffersMap.get(value)!;
                    index = info.index;
                    info.begin = 0;
                    info.end = value.byteLength;
                } else {
                    index = arrayBuffersTable.length;
                    arrayBuffersTable.push(value);
                    arrayBuffersMap.set(value, { index, begin: 0, end: value.byteLength });
                }
                return { __SaNdBoX_TYpe_: 'A', b: index, };

            } else if (typeof value.byteLength === 'number'
                && typeof value.byteOffset === 'number'
                && (value.buffer instanceof ArrayBuffer || (globalThis.SharedArrayBuffer && value.buffer instanceof globalThis.SharedArrayBuffer))
                && (viewType = getArrayBufferViewType(value)) !== undefined
            ) {
                let buffer = value.buffer;
                let bufferIndex: number;
                if (arrayBuffersMap.has(buffer)) {
                    let info = arrayBuffersMap.get(buffer)!;
                    bufferIndex = info.index;
                    info.begin = Math.min(info.begin, value.byteOffset);
                    info.end = Math.max(info.end, value.byteOffset + value.byteLength);
                } else {
                    bufferIndex = arrayBuffersTable.length;
                    arrayBuffersTable.push(buffer);
                    arrayBuffersMap.set(buffer, { index: bufferIndex, begin: value.byteOffset, end: value.byteOffset + value.byteLength });
                }
                return {
                    __SaNdBoX_TYpe_: 'T',
                    t: viewType,
                    b: bufferIndex,
                    o: value.byteOffset,
                    l: value.byteLength,
                };
            } else if (Array.isArray(value)) {
                if (arrayHasHoles(value)) {
                    let res: any[] = [{ __SaNdBoX_TYpe_: 'a' }];
                    value.forEach((v, i) => {
                        res.push([i, serializeValue(v, true)]);
                    });
                    return res;
                } else {
                    return value.map(x => serializeValue(x, true));
                }
            } else {
                let entries = Object.entries(value);
                for (let entry of entries) {
                    entry[1] = serializeValue(entry[1], true);
                }
                return Object.fromEntries(entries);
            }
        }

        case 'symbol':
            throw new Error('Symbol serialization is not allowed.');
        default:
            throw new Error('Unsupported type for serialization.');
    }

}

function arrayBufferItem(arrayBuffer: ArrayBuffer, index: number): any {
    let info = arrayBuffersMap.get(arrayBuffer)!;
    let arr = new Uint8Array(arrayBuffer, info.begin, info.end - info.begin);
    return {
        o: info.begin,
        v: [...arr],
    };
}

export function serialize(obj: any): string {
    try {
        prepare(obj);
        return JSON.stringify({
            r: reuseTable.map(x => serializeValue(x, false)),
            v: serializeValue(obj, true),
            b: arrayBuffersTable.map(arrayBufferItem),
        });
    } finally {
        reuseMap.clear();
        reuseTable.splice(0);
        arrayBuffersMap.clear();
        arrayBuffersTable.splice(0);
    }
}

function test1() {

    let typedArr = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    let obj = {

        'null': null,                          // null            -   null
        'boolean': true,                       // boolean         -   boolean
        'number': 12.3,                        // number          -   number
        'string': 'This is test',              // string          -   string
        'undefined': undefined,                // undefined       -   object[u]
        'bigint': 123456n,                     // bigint          -   object[b] v: string
        'Date': new Date(999),                 // Date            R   object[d] v: number
        'RegExp': /RegExp pattern/gi,          // RegExp          R   object[x] s: string, f: string, l: number
        'Error': new Error('Invalid'),         // Error           R   object[e] n: string, m: string, s: string
        'ArrayBuffer': new ArrayBuffer(4),     // ArrayBuffer     R   object[A] b: number
        'TypedArray': typedArr.subarray(2, 5), // TypedArray      R   object[T] t: type, b: number, o: number, l: number
        'array(holes)': [1, , , , , 2],             // array(holes)    R   array 0: object[a], 1...: [index, value]
        'array(simple)': [1, 2, 3],              // array(simple)   R   array
        'object': { a: 1, b: 2, c: 3 },           // object          R   object
    };
    obj['[reference]'] = obj;
    let ser = serialize(obj);
    console.log(JSON.parse(ser));
    console.log(typedArr.subarray(2, 5).byteOffset);
    console.log(typedArr.subarray(2, 5).buffer === typedArr.buffer);
}

//test1();
