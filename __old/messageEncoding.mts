

const SMALL_STRING_THRESHOLD = 512;

interface SandboxWasmInstance {
    exports: {
        sendCleanArgs(ctx: number): void;
        sendSimpleArg(ctx: number, index: number, type: number): number;
        sendNumberArg(ctx: number, index: number, value: number): number;
        sendBufferArg(ctx: number, index: number, buffer: number, size: number, flags: number): number;
    }
}

class Sandbox {
    public utf8Decoder: TextDecoder;
    public utf16Decoder: TextDecoder | undefined;
    public latin1Decoder: TextDecoder | undefined;
    public textEncoder: TextEncoder;
}

class SandboxContext {
    public sandbox: Sandbox;
    public wasmInstance: SandboxWasmInstance;
    public wasmMemory: WebAssembly.Memory;
    public ctxPtr: number;
    public commonBufferPtr: number;
    public commonBufferSize: number;
}

enum SimpleArgType {
    Undefined = 0,
    Null = 1,
    True = 2,
    False = 3,
}

enum SendResult {
    Failed = 0,
    Success = 1,
    BufferTaken = 2,
}

enum SendBufferFlags {
    String = 0,
    JSON = 1,
    BigInt = 2,
    ArrayBuffer = 3,
    TypeMask = 0xFF,
    TakeBuffer = 0x100,
    Latin1 = 0x200,
}

// Add "T" suffix to avoid collisions with standard types
type TypedArrayT = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
type ArrayBufferViewT = TypedArrayT | DataView;
type ObjectProcessorData = { [name: string]: any } | any[] | ArrayBufferLike | ArrayBufferViewT;
type ObjectProcessorResult = { [name: string]: any } | any[] | ArrayBufferLike | ArrayBufferViewT | string;


/*
\x7F@123 - object reference
\x7F#123 - ArrayBuffer or large latin1 string reference
\x7F\x7F... - prefixed string escapement
\x7FN - NaN
\x7F+ - +Infinity
\x7F- - -Infinity
\x7Fu - undefined or unsupported value

{'': '\xF7', type: ...} - object replacement

*/


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
    Map = 12,
    Set = 13,
    RegExp = 14,
    Date = 15,
    Error = 16,
    BigInt = 17,
}

function arrayBufferViewValue(input: any): ObjectTypeId | undefined {
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
    return undefined;
}

class ObjectProcessor {

    private objectUsage = new Map<any, number>();
    private objectIndexes = new Map<any, number>();
    private sharedObjects: any[] = [];
    private arrayBufferUsage = new Map<ArrayBufferLike, {
        index: number,
        begin: number,
        end: number,
    }>();

    public process(input: object): void {
        this.objectUsage.clear();
        this.arrayBufferUsage.clear();
        if ((typeof input === 'object' || typeof input === 'function') && input !== null) {
            this.prepare(input);
        }
        this.objectIndexes.clear();
        this.objectIndexes.set(input, 0);
        this.sharedObjects = [input];
        for (let [obj, count] of this.objectUsage.entries()) {
            if (count > 1 && obj !== input) {
                this.objectIndexes.set(obj, this.objectIndexes.size);
                this.sharedObjects.push(obj);
            }
        }
        for (let i = 0; i < this.sharedObjects.length; i++) {
            this.sharedObjects[i] = this.processValue(this.sharedObjects[i], false);
        }
        console.log(this.sharedObjects);
        console.log(JSON.stringify(this.sharedObjects, null, 4));
    }

    private processObject(input: object, processReferences: boolean): any {
        if (processReferences && this.objectIndexes.has(input)) {
            return `\x7F@${this.objectIndexes.get(input)}`;
        } else if (input instanceof ArrayBuffer || input instanceof SharedArrayBuffer) {
            return `\x7F#${this.arrayBufferUsage.get(input)!.index}`;
        } else if (
            typeof (input as any).byteLength === 'number'
            && typeof (input as any).byteOffset === 'number'
            && ((input as any).buffer instanceof ArrayBuffer || (input as any).buffer instanceof SharedArrayBuffer)
            && (
                input instanceof Int8Array
                || input instanceof Uint8Array
                || input instanceof Uint8ClampedArray
                || input instanceof Int16Array
                || input instanceof Uint16Array
                || input instanceof Int32Array
                || input instanceof Uint32Array
                || input instanceof Float32Array
                || input instanceof Float64Array
                || input instanceof BigInt64Array
                || input instanceof BigUint64Array
                || input instanceof DataView
            )
        ) {
            let buffer = this.arrayBufferUsage.get(input.buffer);
            return {
                '': '\x7F',
                type: arrayBufferViewValue(input),
                byteOffset: input.byteOffset - buffer!.begin,
                byteLength: input.byteLength,
                buffer: buffer!.index,
            }
        } else if (input instanceof Date) {
            return {
                '': '\x7F',
                type: ObjectTypeId.Date,
                time: input.getTime(),
            }
        } else if (input instanceof RegExp) {
            return {
                '': '\x7F',
                type: ObjectTypeId.RegExp,
                flags: input.flags,
                source: input.source,
                lastIndex: input.lastIndex,
            }
        } else if (input instanceof Error) {
            return {
                '': '\x7F',
                type: ObjectTypeId.Error,
                message: input.message || input.name,
                // TODO: Other error types
            }
        } else if (input instanceof Map) {
            return {
                '': '\x7F',
                type: ObjectTypeId.Map,
                values: this.processObject([...input], true),
            }
        } else if (input instanceof Set) {
            return {
                '': '\x7F',
                type: ObjectTypeId.Set,
                values: this.processObject([...input], true),
            }
        } else if (input instanceof Array) {

            for (let i = 0; i < input.length; i++) {
                //if (!(i in input)) {
                // TODO: return this.processArrayWithEmptyItems(input)
                //} else {
                let processed = this.processValue(input[i], true);
                if (processed !== input[i]) {
                    return this.processNewArray(input, i, processed);
                }
                //}
            }

            return input;

        } else {

            let keys = Object.keys(input);
            for (let i = 0; i < keys.length; i++) {
                let value = input[keys[i]];
                let processed = this.processValue(value, true);
                if (processed !== value) {
                    return this.processNewObject(input, keys, i, processed);
                }
            }

            return input;
        }
    }

    private processNewArray(input: any[], lastIndex: number, lastProcessed: any): any {
        let result = Array.from(input);
        result[lastIndex] = lastProcessed;
        for (let i = lastIndex + 1; i < result.length; i++) {
            result[i] = this.processValue(input[i], true);
        }
        return result;
    }

    private processNewObject(input: object, keys: string[], lastIndex: number, lastProcessed: any): any {
        let result = { ...input };
        result[keys[lastIndex]] = lastProcessed;
        for (let i = lastIndex + 1; i < keys.length; i++) {
            result[keys[i]] = this.processValue(input[keys[i]], true);
        }
        return result;
    }

    private processValue(value: any, processReferences: boolean) {
        switch (typeof value) {
            case 'string':
                if (value.length > SMALL_STRING_THRESHOLD) {
                    return value; // TODO: Try to send large latin1 strings
                } else if (value.startsWith('\x7F')) {
                    return '\x7F' + value;
                }
                return value;
            case 'bigint':
                return {
                    '': '\x7F',
                    type: ObjectTypeId.BigInt,
                    value: value.toString(),
                }
            case 'boolean':
                return value;
            case 'number':
                if (Number.isNaN(value)) {
                    return '\x7FN';
                } else if (Number.isFinite(value)) {
                    return value;
                } else {
                    return value > 0 ? '\x7F+' : '\x7F-';
                }
            case 'function':
            case 'object':
                return value === null ? null : this.processObject(value, processReferences);
            case 'symbol':
            case 'undefined':
            default:
                return '\x7Fu';
        }
    }

    private prepare(input: object): void {

        if (input instanceof ArrayBuffer || input instanceof SharedArrayBuffer) {

            // This is ArrayBufferLike. It is treated differently than other objects.
            if (this.arrayBufferUsage.has(input)) {
                let info = this.arrayBufferUsage.get(input);
                info!.begin = 0;
                info!.end = input.byteLength;
            } else {
                this.arrayBufferUsage.set(input, {
                    index: this.arrayBufferUsage.size,
                    begin: 0,
                    end: input.byteLength,
                });
            }

        } else {

            // Count usages of each object.
            let usage = this.objectUsage.get(input) || 0;
            this.objectUsage.set(input, usage + 1);

            if (
                typeof (input as any).byteLength === 'number'
                && typeof (input as any).byteOffset === 'number'
                && ((input as any).buffer instanceof ArrayBuffer || (input as any).buffer instanceof SharedArrayBuffer)
                && (
                    input instanceof Int8Array
                    || input instanceof Uint8Array
                    || input instanceof Uint8ClampedArray
                    || input instanceof Int16Array
                    || input instanceof Uint16Array
                    || input instanceof Int32Array
                    || input instanceof Uint32Array
                    || input instanceof Float32Array
                    || input instanceof Float64Array
                    || input instanceof BigInt64Array
                    || input instanceof BigUint64Array
                    || input instanceof DataView
                )
            ) {

                // Use underlying ArrayBufferLike instance and its used range.
                let arrayBuffer = input.buffer;
                if (this.arrayBufferUsage.has(arrayBuffer)) {
                    let info = this.arrayBufferUsage.get(arrayBuffer);
                    info!.begin = Math.min(info!.begin, input.byteOffset);
                    info!.end = Math.max(info!.end, input.byteOffset + input.byteLength);
                } else {
                    this.arrayBufferUsage.set(arrayBuffer, {
                        index: this.arrayBufferUsage.size,
                        begin: input.byteOffset,
                        end: input.byteOffset + input.byteLength,
                    });
                }

            } else if (input instanceof Set) {

                for (let item of input) {
                    if (typeof item === 'object' && item !== null) {
                        this.prepare(item);
                    }
                }

            } else if (input instanceof Map) {

                for (let [key, value] of input) {
                    if (typeof key === 'object' && key !== null) {
                        this.prepare(key);
                    }
                    if (typeof value === 'object' && value !== null) {
                        this.prepare(value);
                    }
                }

            } else if (input instanceof Date || input instanceof RegExp || input instanceof Error) {

                // Do not travel on leaf objects.

            } else if (usage === 0) {

                // Travel object or array items if this is the first usage of this object
                let items = (input instanceof Array) ? input : Object.values(input);
                for (let item of items) {
                    if (typeof item === 'object' && item !== null) {
                        this.prepare(item);
                    }
                }
            }
        }
    }

}

let now = new Date();
let now1 = new Date();

let test: any = [
    {
        some: 123,
        inner: {
            innerObject: true,
            now,
        },
    },
    {
        other: now,
        string: 'NormalString',
        pref: '\x7FWith prefix',
    },
    now1,
    new Set([new Date(21434), "Some", now1]),
    new Map<any, any>([[now, "11"], ['key', "value"]]),
];

test.push(test[0].inner);
test[0].recurrence = test[0];
test[0].recurrence2 = test;
test[0].inner.now2 = test[0];

let p = new ObjectProcessor();

p.process(test);


/*
TODO:
    - More data processing:
        - repeating objects must replaced by the references
        - repeating ArrayBuffers (also underlying) must be replaced by the reference to one
          (optionally just part that is actually used by the views)
        - reuse long strings by using references
        - decide if string should go outside of JSON during processing:
            - string is big enough, but threshold should not be too large, e.g. >= 256
            - encoder.encodeInto(common buffer)
            - if not latin1: use string directly
            - if fits: reallocate common and pass to guest, set common = NULL, so it will be allocated later
            - if does not fit: reallocate to str.length and retry
        - ArrayBuffer (not GuestArrayBuffer) processing:
            - reallocate common to required size, set common = NULL, so it will be allocated later
            - copy data
            - pass to guest
        - GuestArrayBuffer processing:
            - just pass to guest
    - arguments array should be converted to JSON as a last argument
      remaining arguments are added during input arguments processing
      remaining arguments are long strings, and ArrayBuffers (not views), because other types will be inside JSON
    - passing JSON: similar to code below, but reallocate common instead of allocating new buffer.
    - delete common buffer before calling the `send` function if it is too large.
*/
