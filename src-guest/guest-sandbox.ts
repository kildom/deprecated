
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
