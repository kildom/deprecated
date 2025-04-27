/*
 * Code was automatically generated. Do not edit manually.
 * Run "npm run wasm-api" to regenerate it.
 */

export interface SandboxWasmExport {
    createNull(): void;
    createArray(): void;
    createUndefined(): void;
    createObject(): void;
    createNumber(a: number): void;
    createDate(a: number): void;
    createRegExp(a: number): void;
    createArrayItem(a: number): void;
    reuseValue(a: number): void;
    createString(a: number, b: number, c: number): void;
    createError(a: number, b: number, c: number): void;
    createBigInt(a: number, b: number, c: number): void;
    createObjectProperty(a: number, b: number, c: number): void;
    clearValues(): void;
    createBoolean(a: number): void;
    createArrayBuffer(a: number, b: number): void;
    createArrayBufferView(a: number, b: number, c: number): void;
    keepValue(): number;
    getRecvError(): number;
    execute(a: number, b: number, c: number, d: number): number;
    call(a: number): number;
    malloc(a: number): number;
    realloc(a: number, b: number, c: number): number;
    free(a: number): void;
    init(a: number, b: number, c: number, d: number): number;
    getSharedBufferPointer(): number;
    getSharedBufferSize(): number;
    getStackPointer(): number;
    setStackPointer(a: number): void;
};

export namespace SandboxWasmImportModule {
    export interface env {
        memory: WebAssembly.Memory;
        clearValues(): void;
        createEngineError(a: number, b: number, c: number): void;
        callToHost(a: number): number;
        log(a: number, b: number): void;
        getMemorySize(): number;
        getStackPointer(): number;
        entry(): number;
        createString(a: number, b: number, c: number): void;
        createUndefined(): void;
        createError(a: number, b: number, c: number): void;
        createNull(): void;
        createArray(): void;
        createObject(): void;
        createBigInt(a: number, b: number, c: number): void;
        createNumber(a: number): void;
        createDate(a: number): void;
        createRegExp(a: number): void;
        createArrayItem(a: number): void;
        createObjectProperty(a: number, b: number, c: number): void;
        createBoolean(a: number): void;
        createArrayBuffer(a: number, b: number): void;
        createArrayBufferView(a: number, b: number, c: number): void;
        reuseValue(a: number): void;
        keepValue(): number;
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
        fd_fdstat_set_flags(a: number, b: number): number;
        fd_prestat_get(a: number, b: number): number;
        fd_prestat_dir_name(a: number, b: number, c: number): number;
        fd_read(a: number, b: number, c: number, d: number): number;
        fd_seek(a: number, b: bigint, c: number, d: number): number;
        path_open(a: number, b: number, c: number, d: number, e: number, f: bigint, g: bigint, h: number, i: number): number;
        path_remove_directory(a: number, b: number, c: number): number;
        path_unlink_file(a: number, b: number, c: number): number;
        proc_exit(a: number): void;
        random_get(a: number, b: number): number;
    };
};

export interface SandboxWasmImport {
    env: SandboxWasmImportModule.env;
    wasi_snapshot_preview1: SandboxWasmImportModule.wasi_snapshot_preview1;
};
