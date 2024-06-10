

export interface GuestSandboxObject {
    cleanValues(): void;
    createNull(): void;
    createUndefined(): void;
    createError(message: string): void;
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
    createHostValue?: (...args: any[]) => void;
};

declare global {
    var __sandbox__: GuestSandboxObject;
};
