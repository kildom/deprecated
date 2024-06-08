/*
 * Code automatically generated with the "wasm-to-ts.mts" script.
 * Run "npm run wasm-to-ts" to regenerate it. Do not edit manully.
 */

export interface SandboxWasmExport {
    memory: WebAssembly.Memory;
    _start(): void;
    execute(a: number, b: number, c: number): number;
    init(a: number, b: number): number;
    getSharedBufferPointer(): number;
    getSharedBufferSize(): number;
};

export namespace SandboxWasmImportModule {
    export interface sandbox {
        cleanValues(): void;
        entry(): number;
        createNull(): void;
        createUndefined(): void;
        createError(a: number, b: number, c: number): void;
        createArray(): void;
        createObject(): void;
        createBigInt(a: number, b: number, c: number): void;
        createNumber(a: number): void;
        createDate(a: number): void;
        createRegExp(a: number): void;
        createArrayItem(a: number): void;
        createString(a: number, b: number, c: number): void;
        createObjectProperty(a: number, b: number, c: number): void;
        createBoolean(a: number): void;
    };
    export interface wasi_snapshot_preview1 {
        fd_write(a: number, b: number, c: number, d: number): number;
        args_get(a: number, b: number): number;
        args_sizes_get(a: number, b: number): number;
        environ_get(a: number, b: number): number;
        environ_sizes_get(a: number, b: number): number;
        clock_res_get(a: number, b: number): number;
        clock_time_get(a: number, b: bigint, c: number): number;
        fd_close(a: number): number;
        fd_fdstat_get(a: number, b: number): number;
        fd_read(a: number, b: number, c: number, d: number): number;
        fd_seek(a: number, b: bigint, c: number, d: number): number;
        proc_exit(a: number): void;
        random_get(a: number, b: number): number;
    };
};

export interface SandboxWasmImport {
    sandbox: SandboxWasmImportModule.sandbox;
    wasi_snapshot_preview1: SandboxWasmImportModule.wasi_snapshot_preview1;
};
