/*
 * Copyright 2025 Dominik Kilian
 *
 * Redistribution and use in source and binary forms,  with or without modification, are permitted provided
 * that the following conditions are met:
 * 1. Redistributions  of source code must retain  the above copyright notice,  this list of conditions and
 *    the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 *    the following disclaimer in the documentation  and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED  BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING,  BUT NOT LIMITED TO,  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT,  INDIRECT,  INCIDENTAL,  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL DAMAGES (INCLUDING,  BUT NOT
 * LIMITED TO,  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;  LOSS OF USE,  DATA,  OR PROFITS;  OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,  WHETHER IN CONTRACT,  STRICT LIABILITY, OR
 * TORT  (INCLUDING NEGLIGENCE OR OTHERWISE)  ARISING IN ANY WAY OUT  OF THE USE OF THIS SOFTWARE,  EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


import * as wasm from './wasm-interface';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

enum ObjectType {
    SandboxString = 0,
    ExceptionResult = 1,
    CompileResult = 2,
};

export enum ExecuteFlags {
    Script = 0,
    Module = 1,
    ReturnValue = 2,
    Once = 4,
};

export enum LogLevel {
    None = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4,
};

enum ErrorType {
    EngineError = 0,
    HostError = 1,
    GuestError = 2,
};


export interface Snapshot {
    readonly module: WebAssembly.Module;
    readonly memorySize: number;
    readonly memoryLimit: number;
    readonly data: Uint8Array;
    readonly dataOffset: number;
    readonly stackPointer: number;
}

interface Imports extends wasm.SandboxWasmImport {
    setInstance(instance: WebAssembly.Instance): void;
};


export class EngineError extends Error {
    public guestStack?: string;
}

export class GuestError extends Error {
    public guestStack?: string;
}

export class HostError extends Error {
    public guestStack?: string;
}

const SandboxStringHeaderSize = 8;
const ExceptionResultSize = 16;

function makeDisposable<T>(obj: T): T {
    if (typeof Symbol.dispose === 'symbol' && typeof (obj as any).dispose === 'function') {
        (obj as any)[Symbol.dispose] = (obj as any).dispose;
    }
    return obj;
}

class SandboxString {

    public ptr: number;
    public size: number;

    public constructor(
        private wrapper: Wrapper,
        value: string | number | undefined | null,
        private owner: boolean = true,
    ) {
        makeDisposable(this);
        try {
            this.ptr = 0;
            this.size = 0;
            if (value === undefined || value === null || value === 0) {
                this.owner = false;
            } else if (typeof value === 'number') {
                this.ptr = value;
                let view = this.wrapper._getView(this.ptr, SandboxStringHeaderSize);
                let size = view.getUint32(4, true);
                this.wrapper._validateRange(this.ptr, SandboxStringHeaderSize + size);
                this.size = size;
            } else {
                let bytes = encoder.encode(value);
                this.ptr = this.wrapper._exports.create(ObjectType.SandboxString, bytes.length);
                if (!this.ptr) {
                    throw new EngineError('Out of memory.');
                }
                this.wrapper._getArray(this.ptr + SandboxStringHeaderSize, bytes.length).set(bytes);
                this.size = bytes.length;
            }
        } catch (e) {
            this.dispose();
            throw e;
        }
    }

    public get(): string | undefined {
        if (this.ptr === 0) return undefined;
        let arr = this.wrapper._getArray(this.ptr + SandboxStringHeaderSize, this.size);
        return decoder.decode(arr);
    }

    dispose() {
        if (this.owner && this.ptr) {
            this.wrapper._exports.dispose(this.ptr);
        }
        this.ptr = 0;
    }
}


/**
 * The `using` keyword alterative since it is not widely supported yet.
 */
class UsingAlt<T> {
    private canceled = false;
    constructor(
        public obj: T
    ) { }
    set(o: T): T { this.obj = o; return o; }
    get(): T { return this.obj; }
    move(): T { let old = this.obj; this.canceled = true; return old; }
    cancel(): void { this.canceled = true; }
    dispose(): void { if (!this.canceled) (this.obj as any)?.dispose?.(); }
}

function usingAtl<T>(): UsingAlt<T | undefined>;
function usingAtl<T>(obj: T): UsingAlt<T>;
function usingAtl<T>(obj?: T): UsingAlt<T> | UsingAlt<T | undefined> {
    return new UsingAlt<T>(obj as any) as any;
}

class ExceptionResult {

    public ptr: number;

    public constructor(
        private wrapper: Wrapper,
        value: Error | number | undefined | null,
    ) {
        makeDisposable(this);
        this.ptr = 0;
        try {
            if (value === undefined || value === null || value === 0) {
                // nothing to do
            } else if (typeof value === 'number') {
                this.ptr = value;
                this.wrapper._validateRange(value, ExceptionResultSize);
            } else {
                this.ptr = this.wrapper._exports.create(ObjectType.ExceptionResult, 0);
                if (!this.ptr) {
                    throw new EngineError('Out of memory.');
                }
                let name = usingAtl<SandboxString>();
                let message = usingAtl<SandboxString>();
                let stack = usingAtl<SandboxString>();
                try {
                    name.obj = new SandboxString(this.wrapper, '' + value.name);
                    message.obj = new SandboxString(this.wrapper, '' + value.message);
                    stack.obj = new SandboxString(this.wrapper, value.stack ? '' + value.stack : undefined);
                    let view = this.wrapper._getView(this.ptr, ExceptionResultSize);
                    view.setUint32(4, name.move()!.ptr, true);
                    view.setUint32(8, message.move()!.ptr, true);
                    view.setUint32(12, stack.move()!.ptr, true);
                    if (value instanceof EngineError) {
                        view.setUint8(2, ErrorType.EngineError);
                    } else if (value instanceof GuestError) {
                        view.setUint8(2, ErrorType.GuestError);
                    } else {
                        view.setUint8(2, ErrorType.HostError);
                    }
                } finally {
                    name.dispose();
                    message.dispose();
                    stack.dispose();
                }
            }
        } catch (e) {
            this.dispose();
            throw e;
        }
    }

    public get(): HostError | GuestError | EngineError | undefined {
        if (this.ptr === 0) return undefined;
        let view = this.wrapper._getView(this.ptr, ExceptionResultSize);
        let type = view.getUint8(2) as ErrorType;
        let name = new SandboxString(this.wrapper, view.getUint32(4, true), false).get();
        let message = new SandboxString(this.wrapper, view.getUint32(8, true), false).get();
        let stack = new SandboxString(this.wrapper, view.getUint32(12, true), false).get();
        let Cls: any;
        if (type === ErrorType.HostError) {
            Cls = HostError;
        } else if (type === ErrorType.GuestError) {
            Cls = GuestError;
        } else {
            Cls = EngineError;
        }
        let error = new Cls(message ?? 'Unknown error.') as Error;
        if (name && error.name !== name) {
            error.name = name;
        }
        if (stack) {
            error.stack = stack; // TODO: Don't replace the stack, append to it or create a new property
        }
        return error;
    }

    dispose() {
        if (this.ptr) {
            this.wrapper._exports.dispose(this.ptr);
        }
        this.ptr = 0;
    }
}


export class CompileResult {

    public ptr: number;

    public constructor(
        private wrapper: Wrapper,
        value: number | undefined | null,
    ) {
        makeDisposable(this);
        if (value === undefined || value === null || value === 0) {
            this.ptr = 0;
        } else {
            this.ptr = value;
        }
    }

    public getFlags(): ExecuteFlags {
        if (this.ptr === 0) return 0;
        let arr = this.wrapper._getArray(this.ptr + 2, 1);
        return arr[0] as ExecuteFlags;
    }

    dispose() {
        if (this.ptr) {
            this.wrapper._exports.dispose(this.ptr);
        }
        this.ptr = 0;
    }
}

function fromPtr(wrapper: Wrapper, ptr: number): undefined | SandboxString | CompileResult | ExceptionResult {
    if (ptr === 0) return undefined;
    let view = wrapper._getView(ptr, 1);
    let type = view.getUint8(0) as ObjectType;
    switch (type) {
        case ObjectType.SandboxString:
            return new SandboxString(wrapper, ptr);
        case ObjectType.CompileResult:
            return new CompileResult(wrapper, ptr);
        case ObjectType.ExceptionResult:
            return new ExceptionResult(wrapper, ptr);
        default:
            throw new EngineError('Unknown object type.');
    }
}


let cachedModules = new WeakMap<WebAssembly.Module, Record<string, WebAssembly.Module>>();

export class Wrapper {

    public onCall?: (groupId: number, functionId: number, arg?: string) => string;
    public onLog?: (level: LogLevel, text: string) => void;

    _instance!: WebAssembly.Instance;
    _exports!: wasm.SandboxWasmExport;
    _memory!: WebAssembly.Memory;
    _oldBuffer?: ArrayBuffer;
    _view!: DataView;
    _array!: Uint8Array;

    private memoryLimit: number;

    public constructor(
        private module: WebAssembly.Module
    ) {
    }

    public async init(gcThresholdMin: number, heapUsedLimit: number, memoryLimit: number, logLevel: LogLevel): Promise<void> {
        // TODO: Add option to set string length limit incoming from the host
        await Wrapper.initWrapper(this, this.module, memoryLimit);
        let ok = this._exports.init(gcThresholdMin, heapUsedLimit, memoryLimit, logLevel);
        if (!ok) {
            throw new EngineError('Initialization failed.');
        }
    }

    private static createImports(wrapper: Wrapper): Imports {

        let initialPages = 0;
        for (let exp of WebAssembly.Module.exports(wrapper.module)) {
            if (exp.name.startsWith('__xTa0gM2eh3_')) {
                initialPages = parseInt(exp.name.substring(13), 16);
                break;
            }
        }
        if (initialPages <= 0) {
            throw new Error('Invalid WebAssembly sandbox module.');
        }

        let memOptions: WebAssembly.MemoryDescriptor = { initial: initialPages };
        if (wrapper.memoryLimit) {
            memOptions.maximum = Math.ceil(wrapper.memoryLimit / 65536);
        }

        let startTime = Date.now();
        let lastTime = 0;
        let memory = new WebAssembly.Memory(memOptions);
        // TODO: Those may be unnecessary
        let instance: WebAssembly.Instance;
        let exports: wasm.SandboxWasmExport;

        return {
            env: {
                memory,
                log(level, str, len) {
                    let arr = new Uint8Array(memory.buffer, str, len);
                    let text = decoder.decode(arr);
                    wrapper.onLog?.(level, text);
                },
                entry() {
                    throw new Error('This should never happen.');
                },
                getRandom(buf, size) {
                    let arr = new Uint8Array(memory.buffer, buf, size);
                    if (globalThis.crypto) {
                        globalThis.crypto.getRandomValues(arr);
                    } else {
                        for (let i = 0; i < arr.length; i++) {
                            arr[i] = Math.floor(Math.random() * 256);
                        }
                    }
                },
                getTime(realTime) {
                    if (realTime) {
                        return BigInt(Date.now());
                    } else if (globalThis.performance) {
                        return BigInt(Math.floor(globalThis.performance.now()));
                    } else {
                        let now = Date.now() - startTime;
                        if (now < lastTime) {
                            startTime = Date.now() - lastTime;
                            now = lastTime;
                        }
                        lastTime = now;
                        return BigInt(now);
                    }
                },
                call: wrapper._callFromGuest.bind(wrapper),
            },
            // TODO: This may be unnecessary
            setInstance(newInstance: WebAssembly.Instance) {
                instance = newInstance;
                exports = instance.exports as any;
            }
        };
    }

    private static async loadEmbeddedModules(imports: Record<string, any>, module: WebAssembly.Module) {
        for (let exp of WebAssembly.Module.exports(module)) {
            if (exp.name.startsWith('__dependency_module_hex:')) {
                let [_tag, name, hex] = exp.name.split(':');
                let depModule: WebAssembly.Module;
                if (cachedModules.has(module) && cachedModules.get(module)![name]) {
                    depModule = cachedModules.get(module)![name];
                } else {
                    const modBytes = new Uint8Array(hex.length / 2);
                    for (let i = 0; i < modBytes.length; i++) {
                        const byte = hex.substring(i * 2, i * 2 + 2);
                        modBytes[i] = parseInt(byte, 16);
                    }
                    depModule = await WebAssembly.compile(modBytes);
                    if (cachedModules.has(module)) {
                        cachedModules.get(module)![name] = depModule;
                    } else {
                        cachedModules.set(module, { [name]: depModule });
                    }
                }
                let depInstance = await WebAssembly.instantiate(depModule, imports as any);
                if (imports[name]) {
                    imports[name] = { ...imports[name], ... depInstance.exports}
                } else {
                    imports[name] = depInstance.exports;
                }
            }
        }
    }

    private static async initWrapper(wrapper: Wrapper, module: WebAssembly.Module, memoryLimit: number) {
        wrapper.memoryLimit = memoryLimit;
        let imports = this.createImports(wrapper);
        await Wrapper.loadEmbeddedModules(imports, module);
        wrapper._instance = await WebAssembly.instantiate(wrapper.module, imports as any);
        imports.setInstance(wrapper._instance);
        wrapper._exports = wrapper._instance.exports as any as wasm.SandboxWasmExport;
        wrapper._memory = imports.env.memory;
    }

    public compile(source: string, fileName: string | undefined | null, flags: ExecuteFlags): CompileResult {
        let resultPtr: number;
        let sourceStr = usingAtl<SandboxString>();
        let fileNameStr = usingAtl<SandboxString>();
        try {
            sourceStr.obj = new SandboxString(this, source);
            fileNameStr.obj = new SandboxString(this, fileName);
            resultPtr = this._exports.compile(sourceStr.obj.ptr, fileNameStr.obj.ptr, flags);
        } finally {
            sourceStr.dispose();
            fileNameStr.dispose();
        }
        if (resultPtr == 0) {
            throw new EngineError('Unknown error during compilation.');
        }
        let result = fromPtr(this, resultPtr);
        if (result instanceof CompileResult) {
            return result;
        }
        try {
            if (result instanceof ExceptionResult) {
                throw result.get();
            } else {
                throw new EngineError('Unexpected result of compilation.');
            }
        } finally {
            result?.dispose();
        }
    }

    public execute(bytecode: CompileResult, arg?: string | null): string | undefined {
        let resultPtr: number;
        let argStr = new SandboxString(this, arg);
        try {
            resultPtr = this._exports.execute(bytecode.ptr, argStr.ptr);
        } finally {
            argStr.dispose();
        }
        if (resultPtr == 0) {
            return undefined;
        }
        let result = fromPtr(this, resultPtr);
        try {
            if (result instanceof SandboxString) {
                return result.get();
            } else if (result instanceof ExceptionResult) {
                throw result.get();
            } else {
                throw new EngineError('Unexpected result of execution.');
            }
        } finally {
            result?.dispose();
        }
    }

    public call(groupId: number, functionId: number, arg?: string): string {
        let resultPtr: number;
        let argStr = new SandboxString(this, arg);
        try {
            resultPtr = this._exports.call(groupId, functionId, argStr.ptr);
        } finally {
            argStr.dispose();
        }
        let result = fromPtr(this, resultPtr);
        try {
            if (result instanceof SandboxString) {
                return result.get() ?? '';
            } else if (result instanceof ExceptionResult) {
                throw result.get();
            } else {
                throw new EngineError('Unexpected result of guest call.');
            }
        } finally {
            result?.dispose();
        }
    }

    private _callFromGuest(groupId: number, functionId: number, arg: number): number {
        let argStr = new SandboxString(this, arg, false);
        let res = this.onCall?.(groupId, functionId, argStr.get());
        let resStr = new SandboxString(this, res, false);
        return resStr.ptr;
    }

    public _validateRange(ptr: number, length: number) {
        let end = ptr + length;
        if (ptr <= 0 || end > this._memory.buffer.byteLength) {
            throw new EngineError('Address out of memory.');
        }
    }

    public _getView(ptr: number, length: number) {
        let end = ptr + length;
        if (ptr <= 0 || end > this._memory.buffer.byteLength) {
            throw new EngineError('Address out of memory.');
        }
        return new DataView(this._memory.buffer, ptr, length);
    }

    public _getArray(ptr: number, length: number): Uint8Array {
        let end = ptr + length;
        if (ptr <= 0 || end > this._memory.buffer.byteLength) {
            throw new EngineError('Address out of memory.');
        }
        return new Uint8Array(this._memory.buffer, ptr, length);
    }

    private createSnapshotData(): [Uint8Array, number] {
        let all = new Uint32Array(this._memory.buffer);
        let trimBegin = 0;
        while (all[trimBegin] === 0) {
            trimBegin++;
            if (trimBegin >= all.length) {
                return [new Uint8Array(0), 0];
            }
        }
        let trimEnd = all.length;
        while (trimEnd > 0 && all[trimEnd - 1] === 0) {
            trimEnd--;
        }
        let data = new Uint8Array(this._memory.buffer, trimBegin * 4, (trimEnd - trimBegin) * 4).slice();
        return [data, trimBegin * 4];
    }

    public takeSnapshot(): Snapshot {
        // TODO: CompileResult is not preserved by snapshots.
        /*
        Solution: don't use compile-execute model. WASM module should export only execute function
        that takes source code as argument (internally it will take ownership of source and file name, compile and execute once).
        For re-usable code, suggest to user to use imports/exports. Once code is no longer needed, user can
        override it with undefined (or null) to allow GC to reclaim the memory.
        Benefits: simpler code, API, testing, memory savings.
        Cons: None?
        */
        let stackPointer = this._exports.getStackPointer();
        let [data, dataOffset] = this.createSnapshotData();
        return {
            module: this.module,
            memorySize: this._memory.buffer.byteLength,
            memoryLimit: this.memoryLimit,
            data,
            dataOffset,
            stackPointer,
        };
    }

    public static async fromSnapshot(snapshot: Snapshot): Promise<Wrapper> {
        let wrapper = new Wrapper(snapshot.module);
        await Wrapper.initWrapper(wrapper, snapshot.module, snapshot.memoryLimit);
        wrapper._exports.setStackPointer(snapshot.stackPointer);
        let growBytes = snapshot.memorySize - wrapper._memory.buffer.byteLength;
        if (growBytes < 0 || growBytes % 65536 !== 0) {
            throw new EngineError('Invalid snapshot.');
        }
        wrapper._memory.grow(growBytes / 65536);
        let arr = new Uint8Array(wrapper._memory.buffer);
        arr.fill(0, 0, snapshot.dataOffset);
        arr.set(snapshot.data, snapshot.dataOffset);
        arr.fill(0, snapshot.dataOffset + snapshot.data.length);
        return wrapper;
    }
}
