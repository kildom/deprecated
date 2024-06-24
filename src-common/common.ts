
export const exportInfoPrefix = '__xTa0gM2eh3_';

export interface ExportInfoData {
    stackPointerBegin: number;
    stackPointerSize: number;
    dataSectionBegin: number;
    dataSectionSize: number;
    initialPagesBegin: number;
    initialPagesSize: number;
    initialPages: number;
}

export type RegisterCallbacks = { [key: string]: Function | RegisterCallbacks };


export enum SandboxSpecialCommand {
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
