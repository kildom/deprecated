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


import { SandboxWasmImportModule } from "./wasm-interface";

enum ErrNo {
    BADF = 8,
};

export class WasiSystemExit extends Error {
    constructor(code: number) {
        super(`Exit with code: ${code}`);
    }
}

export interface WasiImports extends SandboxWasmImportModule.wasi_snapshot_preview1 {
    setMemory(memory: WebAssembly.Memory): void;
};

export function createWasiImports(initialMemory?: WebAssembly.Memory): WasiImports {

    let memory = initialMemory!;
    let arrayBuffer: ArrayBuffer;
    let view: DataView;
    let byteArray: Uint8Array;
    let fdCnt = 4;

    function refreshViews() {
        if (arrayBuffer != memory.buffer) {
            arrayBuffer = memory.buffer;
            view = new DataView(arrayBuffer);
            byteArray = new Uint8Array(arrayBuffer);
        }
    }

    function getView(offset: number, length: number) {
        return new DataView(arrayBuffer, offset, length);
    }

    return {

        path_remove_directory(a, b, c): number {
            throw new Error('TODO:'); // TODO: implement
        },

        path_unlink_file(a, b, c) {
            throw new Error('TODO:'); // TODO: implement
        },

        setMemory(mem: WebAssembly.Memory) {
            memory = mem;
            arrayBuffer = memory.buffer;
            view = new DataView(arrayBuffer);
            byteArray = new Uint8Array(arrayBuffer);
        },

        args_get(argv: number, argv_buf: number) {
            refreshViews();
            view.setUint32(argv, argv_buf, true);
            view.setUint8(argv_buf, 48);
            view.setUint8(argv_buf + 1, 0);
            return 0;
        },

        args_sizes_get(argc: number, argv_buf_size: number) {
            refreshViews();
            view.setUint32(argc, 1, true);
            view.setUint32(argv_buf_size, 2, true);
            return 0;
        },

        environ_get(environ: number, environ_buf: number) {
            return 0;
        },

        environ_sizes_get(environ_count: number, environ_buf_size: number) {
            refreshViews();
            view.setUint32(environ_count, 0, true);
            view.setUint32(environ_buf_size, 0, true);
            return 0;
        },

        clock_res_get(clock_id: number, resolution: number) {
            refreshViews();
            view.setUint32(resolution, 1000000, true);
            return 0;
        },

        clock_time_get(clock_id: number, precision: bigint, time: number) {
            refreshViews();
            let now = Date.now();
            view.setBigUint64(time, BigInt(now) * 1000000n, true);
            return 0;
        },

        random_get(buf: number, buf_len: number) {
            refreshViews();
            for (let offset = buf; offset < buf + buf_len; offset++) {
                byteArray[offset] = Math.ceil(256 * Math.random());
            }
            return 0;
        },

        fd_read() {
            throw new Error('UNSUPPORTED: fd_read');
            return -1;
        },

        fd_write(fd: number, iovs: number, iovs_len: number, nwritten: number) {
            if (fd != 1 && fd != 2) return ErrNo.BADF;
            refreshViews();
            let str = '';
            for (let i = 0; i < iovs_len; i++) {
                let ptr = view.getUint32(iovs + 8 * i, true);
                let size = view.getUint32(iovs + 8 * i + 4, true);
                str += new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer, ptr, size));
            }
            if (fd == 1) {
                console.log(str);
            } else {
                console.error(str);
            }
            return -1;
        },

        fd_seek() {
            throw new Error('UNSUPPORTED: fd_seek');
            return 0;
        },

        fd_close() {
            throw new Error('UNSUPPORTED: fd_close');
            return 0;
        },

        fd_fdstat_get() {
            throw new Error('UNSUPPORTED: fd_fdstat_get');
            return -1;
        },

        proc_exit(code: number) {
            throw new WasiSystemExit(code);
        },

        fd_fdstat_set_flags() {
            throw new Error('UNSUPPORTED: fd_fdstat_set_flags');
            return 0;
        },
        fd_prestat_get(fd: number, buffer: number) {
            return ErrNo.BADF;
        },
        fd_prestat_dir_name(fd: number, path: number, path_len: number) {
            return ErrNo.BADF;
        },
        path_open() {
            throw new Error('UNSUPPORTED: path_open');
            return fdCnt++;
        },
    };
};
