
export type RegisterCallbacks = { [key: string]: Function | RegisterCallbacks };

export enum SandboxCommand {
    Register = -1,
    Call = -2,
};


export enum ArrayBufferViewType {
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


export interface GuestSandboxObject {
    clearValues(): void;
    createNull(): void;
    createUndefined(): void;
    createError(error: any): void;
    createArray(): void;
    createObject(): void;
    createBigInt(): void;
    createNumber(value: number): void;
    createDate(time: number): void;
    createRegExp(lastIndex: number): void;
    createArrayItem(index: number): void;
    createString(value: string): void;
    createObjectProperty(name: string): void;
    createBigInt(valueString: string): void;
    createBoolean(value: boolean): void;
    createArrayBuffer(arrayBuffer: ArrayBufferLike, offset: number, length: number): void;
    createArrayBufferView(type: ArrayBufferViewType, offset: number, length: number): void;
    reuseValue(index: number): void;
    keepValue(): number;

    callToHost(command: number): boolean;

    createHostValue?: (...args: any[]) => void;
    callFromHost?: (command: number) => void;
    registerExports?: (callbacks: RegisterCallbacks) => void;

    imports: RegisterCallbacks;

    recv: {
        clearValues?: () => void;
        createNull?: () => void;
        createArray?: () => void;
        createUndefined?: () => void;
        createObject?: () => void;
        createNumber?: (value: number) => void;
        createDate?: (time: number) => void;
        createRegExp?: (lastIndex: number) => void;
        createArrayItem?: (index: number) => void;
        reuseValue?: (index: number) => void;
        createString?: (value: string) => void;
        createError?: (message: string) => void;
        createBigInt?: (value: string) => void;
        createObjectProperty?: (name: string) => void;
        createBoolean?: (value: boolean) => void;
        createArrayBuffer?: (value: ArrayBuffer) => void;
        createArrayBufferView?: (type: ArrayBufferViewType, offset: number, length: number) => void;
        keepValue?: () => number;
        getRecvError?: () => Error | undefined;
    };
};

declare global {
    var __sandbox__: GuestSandboxObject;
};
