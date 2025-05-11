/*
 * Code was automatically generated. Do not edit manually.
 * Run "npm run wasm-api" to regenerate it.
 */

export interface SandboxWasmExport {
    malloc(/* uint32_t */ size: number): /* void* */ number;
    realloc(/* void* */ ptr: number, /* uint32_t */ oldSize: number, /* uint32_t */ newSize: number): /* void* */ number;
    free(/* void* */ ptr: number): void;
    create(/* uint32_t */ type: number, /* uint32_t */ additionalSize: number): /* SandboxObject* */ number;
    dispose(/* SandboxObject* */ object: number): void;
    compile(/* SandboxString* */ source: number, /* SandboxString* */ fileName: number, /* ExecuteFlags::T */ flags: number): /* SandboxObject* */ number;
    execute(/* CompileResult* */ code: number, /* SandboxString* */ arg: number): /* SandboxObject* */ number;
    call(/* uint32_t */ groupId: number, /* uint32_t */ functionId: number, /* SandboxString* */ arg: number): /* SandboxObject* */ number;
    init(/* uint32_t */ aggressiveGCThreshold: number, /* uint32_t */ hardGCThreshold: number, /* uint32_t */ memoryLimit: number, /* LogLevel::T */ logLevel: number): /* bool */ number;
    getStackPointer(): /* uint32_t */ number;
    setStackPointer(/* uint32_t */ value: number): void;
};

export namespace SandboxWasmImportModule {
    export interface env {
        memory: WebAssembly.Memory;
        log(/* LogLevel::T */ level: number, /* const void* */ str: number, /* uint32_t */ len: number): void;
        getMemorySize(): number;
        getStackPointer(): number;
        entry(): number;
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
