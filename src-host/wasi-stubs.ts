import { SandboxWasmImportModule } from "./wasm-interface";

export class WasiSystemExit extends Error {
    constructor(code: number) {
        super(`Exit with code: ${code}`);
    }
}

export interface WasiImports extends SandboxWasmImportModule.wasi_snapshot_preview1 {
    setMemory(memory: WebAssembly.Memory): void;
};

export function createWasiImports(): WasiImports {

    let memory: WebAssembly.Memory;
    let arrayBuffer: ArrayBuffer;
    let view: DataView;
    let byteArray: Uint8Array;

    function refreshViews() {
        if (arrayBuffer != memory.buffer) {
            arrayBuffer = memory.buffer;
            view = new DataView(arrayBuffer);
            byteArray = new Uint8Array(arrayBuffer);
        }
    }

    return {

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
            return -1;
        },

        fd_write() {
            return -1;
        },

        fd_seek() {
            return 0;
        },

        fd_close() {
            return 0;
        },

        fd_fdstat_get() {
            return -1;
        },

        proc_exit(code: number) {
            throw new WasiSystemExit(code);
        },
    };
};
