
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

let memory: WebAssembly.Memory;
let arrayBuffer: ArrayBuffer;
let byteArray: Uint8Array; // TODO: Maybe not needed

const valueStack: any[] = [];
const reusableStack: any[] = [];
let errorState: any = undefined;

function refreshViews(): void {
    if (arrayBuffer != memory.buffer) {
        arrayBuffer = memory.buffer;
        byteArray = new Uint8Array(arrayBuffer);
    }
}

export function init(mem: WebAssembly.Memory): void {
    memory = mem;
    arrayBuffer = mem.buffer;
    byteArray = new Uint8Array(arrayBuffer);
    valueStack.splice(0);
    reusableStack.splice(0);
    errorState = undefined;
}

export function cleanValues(): void {
    valueStack.splice(0);
    reusableStack.splice(0);
    errorState = undefined;
}

export function createNull(): void {
    if (errorState) return;
    valueStack.push(null);
}

export function createUndefined(): void {
    if (errorState) return;
    valueStack.push(undefined);
}

export function createError(encoding: number, buffer: number, size: number): void {
    if (errorState) return;
    try {
        valueStack.push(new Error(decodeString(encoding, buffer, size)));
    } catch (error) {
        errorState = error?.message || error?.name || error?.toString?.() || 'Error';
    }
}

export function createArray(): void {
    if (errorState) return;
    valueStack.push([]);
}

export function createObject(): void {
    if (errorState) return;
    valueStack.push({});
}

export function createBigInt(encoding: number, buffer: number, size: number): void {
    if (errorState) return;
    try {
        valueStack.push(BigInt(decodeString(encoding, buffer, size)));
    } catch (error) {
        errorState = error?.message || error?.name || error?.toString?.() || 'Error';
    }
}

export function createNumber(num: number): void {
    if (errorState) return;
    valueStack.push(num);
}

export function createDate(num: number): void {
    if (errorState) return;
    try {
        valueStack.push(new Date(num));
    } catch (error) {
        errorState = error?.message || error?.name || error?.toString?.() || 'Error';
    }
}

export function createRegExp(lastIndex: number): void {
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
}

export function createArrayItem(index: number): void {
    if (errorState) return;
    try {
        let value = valueStack.pop();
        let array = valueStack.at(-1);
        array[index] = value;
    } catch (error) {
        errorState = error?.message || error?.name || error?.toString?.() || 'Error';
    }
}

export function createString(encoding: number, buffer: number, size: number): void {
    if (errorState) return;
    try {
        valueStack.push(decodeString(encoding, buffer, size));
    } catch (error) {
        errorState = error?.message || error?.name || error?.toString?.() || 'Error';
    }
}

export function createObjectProperty(encoding: number, buffer: number, size: number): void {
    if (errorState) return;
    try {
        let value = valueStack.pop();
        let obj = valueStack.at(-1);
        let name = decodeString(encoding, buffer, size);
        obj[name] = value;
    } catch (error) {
        errorState = error?.message || error?.name || error?.toString?.() || 'Error';
    }
}

export function createBoolean(num: number): void {
    if (errorState) return;
    valueStack.push(num === 0 ? false : true);
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
