
import { ArrayBufferViewType, RegisterCallbacks } from '../src-common/common';


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
        createValue?: (value: number | string | boolean | ArrayBuffer) => void;
        createNull?: () => void;
        createUndefined?: () => void;
        createArray?: () => void;
        createArrayItem?: (index: number) => void;
        createObject?: () => void;
        createObjectProperty?: (name: string) => void;
        createBigInt?: (value: string) => void;
        createDate?: (time: number) => void;
        createRegExp?: (lastIndex: number) => void;
        createError?: (message: string) => void;
        createArrayBufferView?: (type: ArrayBufferViewType, offset: number, length: number) => void;
        keepValue?: () => number;
        reuseValue?: (index: number) => void;
        getRecvError?: () => Error | undefined;
    };
};

declare global {
    var __sandbox__: GuestSandboxObject;
};
