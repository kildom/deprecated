import { ArrayBufferViewType, serialize } from "./serializer";


function getArrayBufferViewClass(type: ArrayBufferViewType): undefined | typeof Int8Array {
    switch (type) {
        case ArrayBufferViewType.Int8Array:
            return Int8Array as any;
        case ArrayBufferViewType.Uint8Array:
            return Uint8Array as any;
        case ArrayBufferViewType.Int16Array:
            return Int16Array as any;
        case ArrayBufferViewType.Uint16Array:
            return Uint16Array as any;
        case ArrayBufferViewType.Int32Array:
            return Int32Array as any;
        case ArrayBufferViewType.Uint32Array:
            return Uint32Array as any;
        case ArrayBufferViewType.Float32Array:
            return Float32Array as any;
        case ArrayBufferViewType.Float64Array:
            return Float64Array as any;
        case ArrayBufferViewType.Uint8ClampedArray:
            return Uint8ClampedArray as any;
        case ArrayBufferViewType.DataView:
            return DataView as any;
        case ArrayBufferViewType.BigInt64Array:
            return globalThis.BigInt64Array as any;
        case ArrayBufferViewType.BigUint64Array:
            return globalThis.BigUint64Array as any;
        default:
            return undefined;
    }
}


export function deserialize(text: string): any {
    let root = JSON.parse(text);
    let reuseTable: any[] = root.r;

    // Deserialize the array buffers
    let arrayBuffersTable: { offset: number, buffer: ArrayBuffer }[] =
        (root.b as { o: number, v: number[] }[])
            .map(info => ({ offset: info.o, buffer: (new Uint8Array(info.v)).buffer }));

    // Deserialize reusable objects that deserialization return different object than provided.
    // Those are leaf objects, so there is no risk of referencing not yet deserialized object.
    for (let i = 0; i < reuseTable.length; i++) {
        let value = reuseTable[i];
        if (typeof value === 'object' && value !== null && value.__SaNdBoX_TYpe_
            && 'dxeAT'.indexOf(value.__SaNdBoX_TYpe_) >= 0
        ) {
            reuseTable[i] = deserializeValue(value, false);
        }
    }

    // Deserialize remaining reusable objects.
    for (let i = 0; i < reuseTable.length; i++) {
        let value = reuseTable[i];
        if (!value.__SaNdBoX_TYpe_ || 'dxeAT'.indexOf(value.__SaNdBoX_TYpe_) > 0) {
            reuseTable[i] = deserializeValue(value, true);
        }
    }

    // Deserialize main value
    return deserializeValue(root.v, false);

    function deserializeValue(value: any, mustReturnTheSame: boolean): any {
        if (typeof value === 'object') {
            if (value === null) {
                // null - return as is
            } else if (Array.isArray(value)) {
                if (value[0].__SaNdBoX_TYpe_ === 'a') {
                    // Array with holes
                    let input = value.slice(1);
                    value.splice(0);
                    for (let [index, item] of input) {
                        value[index] = deserializeValue(item, false);
                    }
                } else {
                    // Array without holes
                    for (let i = 0; i < value.length; i++) {
                        value[i] = deserializeValue(value[i], false);
                    }
                }
            } else if (value.__SaNdBoX_TYpe_ === 'r') {
                return reuseTable[value.i];
            } else if (value.__SaNdBoX_TYpe_ === 'u') {
                return undefined;
            } else if (value.__SaNdBoX_TYpe_ === 'b') {
                return BigInt(value.v);
            } else if (value.__SaNdBoX_TYpe_ === 'd') {
                return new Date(value.v);
            } else if (value.__SaNdBoX_TYpe_ === 'x') {
                let regExp = new RegExp(value.s, value.f);
                regExp.lastIndex = value.l;
                return regExp;
            } else if (value.__SaNdBoX_TYpe_ === 'e') {
                let error = new Error(value.m);
                error.name = value.n || 'Error';
                if (value.s) {
                    error.stack = value.s;
                }
                return error;
            } else if (value.__SaNdBoX_TYpe_ === 'A') {
                return arrayBuffersTable[value.b].buffer;
            } else if (value.__SaNdBoX_TYpe_ === 'T') {
                let info = arrayBuffersTable[value.b];
                let type = value.t as ArrayBufferViewType;
                let buffer = info.buffer;
                let offset = value.o - info.offset;
                let length = value.l as number;
                let Cls = getArrayBufferViewClass(type);
                if (!Cls) {
                    throw new Error(`Unsupported ArrayBufferView type: ${type}`);
                }
                return new Cls(buffer, offset, length);
            } else {
                for (let key in value) {
                    value[key] = deserializeValue(value[key], false);
                }
            }
        }
        return value;
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
    obj['[reference2]'] = obj.RegExp;
    obj['TypedArray2'] = obj.TypedArray.subarray(1, 3);
    let ser = serialize(obj);
    console.log(JSON.stringify(JSON.parse(ser), null, 4));
    console.log(deserialize(ser));
}

test1();
