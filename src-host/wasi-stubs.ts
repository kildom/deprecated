import { SandboxWasmImportModule } from "./wasm-interface";

export class WasiSystemExit extends Error {
    constructor(public code: number) {
        super(`Exit with code: ${code}`);
    }
}

export class WasiSnapshotPreview1 implements SandboxWasmImportModule.wasi_snapshot_preview1 {

    private memory: WebAssembly.Memory;
    private arrayBuffer: ArrayBuffer;
    private view: DataView;
    private byteArray: Uint8Array;

    public setMemory(memory: WebAssembly.Memory) {
        this.memory = memory;
        this.arrayBuffer = memory.buffer;
        this.view = new DataView(this.arrayBuffer);
        this.byteArray = new Uint8Array(this.arrayBuffer);
    }

    private refreshViews() {
        if (this.arrayBuffer != this.memory.buffer) {
            this.arrayBuffer = this.memory.buffer;
            this.view = new DataView(this.arrayBuffer);
            this.byteArray = new Uint8Array(this.arrayBuffer);
        }
    }

    public args_get(argv: number, argv_buf: number) {
        this.refreshViews();
        this.view.setUint32(argv, argv_buf, true);
        this.view.setUint8(argv_buf, 48);
        this.view.setUint8(argv_buf + 1, 0);
        return 0;
    }
    public args_sizes_get(argc: number, argv_buf_size: number) {
        this.refreshViews();
        this.view.setUint32(argc, 1, true);
        this.view.setUint32(argv_buf_size, 2, true);
        return 0;
    }
    public environ_get(environ: number, environ_buf: number) {
        return 0;
    }
    public environ_sizes_get(environ_count: number, environ_buf_size: number) {
        this.refreshViews();
        this.view.setUint32(environ_count, 0, true);
        this.view.setUint32(environ_buf_size, 0, true);
        return 0;
    }
    public clock_res_get(clock_id: number, resolution: number) {
        this.refreshViews();
        this.view.setUint32(resolution, 1000000, true);
        return 0;
    }
    public clock_time_get(clock_id: number, precision: bigint, time: number) {
        this.refreshViews();
        let now = Date.now();
        this.view.setBigUint64(time, BigInt(now) * 1000000n, true);
        return 0;
    }
    public random_get(buf: number, buf_len: number) {
        this.refreshViews();
        for (let offset = buf; offset < buf + buf_len; offset++) {
            this.byteArray[offset] = Math.ceil(256 * Math.random());
        }
        return 0;
    }
    public fd_read() {
        return -1;
    }
    public fd_write() {
        return -1;
    }
    public fd_seek() {
        return 0;
    }
    public fd_close() {
        return 0;
    }
    public fd_fdstat_get() {
        return -1;
    }
    public proc_exit(code: number) {
        throw new WasiSystemExit(code);
    }
};
