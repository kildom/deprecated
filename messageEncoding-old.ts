
const COMMON_BUFFER_SIZE = 8 * 1024;
const SMALL_STRING_THRESHOLD = 2 * 1024;

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
type ObjectProcessorData = { [name: string]: any } | any[] | ArrayBufferLike | ArrayBufferView;
type ObjectProcessorResult = { [name: string]: any } | any[] | ArrayBufferLike | ArrayBufferView | string;


class ObjectProcessor {

    private objectUsage = new Map<any, number>();
    private arrayBufferUsage = new Map<ArrayBufferLike, {
        index: number,
        begin: number,
        end: number,
    }>();

    public process(input: ObjectProcessorData): ObjectProcessorData {
        this.objectUsage.clear();
        this.arrayBufferUsage.clear();
        this.prepare(input);
    }

    private prepare(input: { [name: string]: any } | any[] | ArrayBufferLike | ArrayBufferView): void {

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

            } else if (input instanceof Date
                || input instanceof RegExp
                || input instanceof Error
                || input instanceof Map
                || input instanceof Set
            ) {

                // Do not travel on leaf objects.

            } else if (usage === 0) {

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

    private processBranch(input: { [name: string]: any } | any[]): { [name: string]: any } | any[] | string {
        if (this.objects.has(input)) {

        }
    }

}


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

function processObject(arg: Object, additionalStart: number, additionalArgs: any[]): Object {
    if (arg instanceof Array) {
        let changed = false;
        for (let i = 0; i < arg.length; i++) {
            let item = arg[i];
            let newItem: any;
            if (typeof item === 'object' && item !== null) {
                newItem = processObject(item, additionalStart, additionalArgs);
            } else if (typeof item === 'string' && item.length > SMALL_STRING_THRESHOLD) {
                newItem = 0;
            }
            if (item !== newItem) {

            }
        }
    }
    return arg;
}


function sendMessage(ctx: SandboxContext, ...args: any[]): any {
    const sandbox = ctx.sandbox;
    const exports = ctx.wasmInstance.exports;
    const memory = ctx.wasmMemory;
    exports.sendCleanArgs(ctx.ctxPtr);
    let argIndex = 0;
    let additionalArgs: any[] = [];
    for (let arg of args) {
        let response: number = 0;
        let bufferPtr: number = 0;
        if (typeof arg === 'boolean') {
            response = exports.sendSimpleArg(ctx.ctxPtr, argIndex, arg ? SimpleArgType.True : SimpleArgType.False);
            argIndex++;
        } else if (typeof arg === 'undefined') {
            response = exports.sendSimpleArg(ctx.ctxPtr, argIndex, SimpleArgType.Undefined);
            argIndex++;
        } else if (arg === null) {
            response = exports.sendSimpleArg(ctx.ctxPtr, argIndex, SimpleArgType.Null);
            argIndex++;
        } else if (typeof arg === 'number') {
            response = exports.sendNumberArg(ctx.ctxPtr, argIndex, arg);
            argIndex++;
        } else if (typeof arg === 'bigint') {
            let text = arg.toString();
            bufferPtr = ctx.requestBufferMaybeCommon(text.length);
            sandbox.textEncoder.encodeInto(text, new Uint8Array(memory.buffer, bufferPtr, text.length));
            response = exports.sendBufferArg(ctx.ctxPtr, argIndex, bufferPtr, text.length, SendBufferFlags.BigInt | SendBufferFlags.Latin1);
            argIndex++;
        } else if (typeof arg === 'string') {
            let flags = SendBufferFlags.String;
            let stat: TextEncoderEncodeIntoResult;
            if (arg.length <= SMALL_STRING_THRESHOLD) {
                bufferPtr = ctx.getCommonBuffer();
                stat = sandbox.textEncoder.encodeInto(arg, new Uint8Array(memory.buffer, bufferPtr, ctx.commonBufferSize));
                if (stat.written === arg.length) {
                    flags |= SendBufferFlags.Latin1;
                }
            } else {
                bufferPtr = ctx.requestBuffer(2 * arg.length);
                stat = sandbox.textEncoder.encodeInto(arg, new Uint8Array(memory.buffer, bufferPtr, 2 * arg.length));
                if (stat.read < arg.length) {
                    let remainingChars = arg.length - stat.read;
                    let requiredSize = stat.written + 3 * remainingChars;
                    if (requiredSize <= ctx.commonBufferSize) {
                        ctx.freeBuffer(bufferPtr);
                        bufferPtr = ctx.commonBufferPtr;
                    } else {
                        bufferPtr = ctx.reallocBuffer(bufferPtr, requiredSize);
                    }
                    stat = sandbox.textEncoder.encodeInto(arg, new Uint8Array(memory.buffer, bufferPtr, requiredSize));
                } else if (stat.written === arg.length) {
                    flags |= SendBufferFlags.Latin1 | SendBufferFlags.TakeBuffer;
                }
            }
            response = exports.sendBufferArg(ctx.ctxPtr, argIndex, bufferPtr, stat.written, flags);
            argIndex++;
        } else if (typeof arg === 'function' || typeof arg === 'symbol') {
            throw new Error('Sending functions and symbols to guest is unsupported.');
        } else if (arg instanceof ArrayBuffer) {
        } else if (typeof arg === 'object') {
            let flags = SendBufferFlags.JSON;
            let obj = processObject(arg, args.length, additionalArgs);
            let text = JSON.stringify(obj);
            let stat: TextEncoderEncodeIntoResult;
            if (text.length <= ctx.commonBufferSize) {
                bufferPtr = ctx.commonBufferPtr;
                stat = sandbox.textEncoder.encodeInto(text, new Uint8Array(memory.buffer, bufferPtr, ctx.commonBufferSize));
                if (stat.written === text.length) {
                    flags |= SendBufferFlags.Latin1;
                }
            } else {
                bufferPtr = ctx.requestBuffer(2 * text.length);
                stat = sandbox.textEncoder.encodeInto(text, new Uint8Array(memory.buffer, bufferPtr, 2 * text.length));
                if (stat.written === text.length) {
                    flags |= SendBufferFlags.Latin1;
                }
            }
            if (stat.read < text.length) {
                let remainingChars = text.length - stat.read;
                let requiredSize = stat.written + 3 * remainingChars;
                if (bufferPtr === ctx.commonBufferPtr) {
                    bufferPtr = ctx.requestBuffer(requiredSize);
                } else {
                    bufferPtr = ctx.reallocBuffer(bufferPtr, requiredSize);
                }
                stat = sandbox.textEncoder.encodeInto(text, new Uint8Array(memory.buffer, bufferPtr, requiredSize));
            }
            response = exports.sendBufferArg(ctx.ctxPtr, argIndex, bufferPtr, stat.written, flags);
            argIndex++;
        }
    }
}
