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


/*
 * Code was automatically generated. Do not edit manually.
 * Run "npm run wasm-api" to regenerate it.
 */


export interface SandboxWasmExport {
    create(/* uint32_t */ type: number, /* uint32_t */ size: number): /* SandboxAny* */ number;
    dispose(/* SandboxAny* */ object: number): void;
    compile(/* SandboxString* */ source: number, /* SandboxString* */ fileName: number, /* ExecuteFlags::T */ flags: number): /* SandboxAny* */ number;
    execute(/* CompileResult* */ code: number, /* SandboxString* */ arg: number): /* SandboxAny* */ number;
    call(/* uint32_t */ groupId: number, /* uint32_t */ functionId: number, /* SandboxString* */ arg: number): /* SandboxAny* */ number;
    init(/* uint32_t */ gcThresholdMin: number, /* uint32_t */ heapUsedLimit: number, /* uint32_t */ memoryLimit: number, /* LogLevel::T */ logLevel: number): /* bool */ number;
    getStackPointer(): /* uint32_t */ number;
    setStackPointer(/* uint32_t */ value: number): void;
};

export namespace SandboxWasmImportModule {
    export interface env {
        memory: WebAssembly.Memory;
        call(/* uint32_t */ groupId: number, /* uint32_t */ functionId: number, /* SandboxString* */ arg: number): number;
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
