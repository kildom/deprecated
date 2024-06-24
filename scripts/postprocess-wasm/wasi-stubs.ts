import { SandboxWasmImportModule } from './wasm-interface';

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

    let randSeed = 234987;

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
            let now = 1718795365619;
            view.setBigUint64(time, BigInt(now) * 1000000n, true);
            return 0;
        },

        random_get(buf: number, buf_len: number) {
            refreshViews();
            for (let offset = buf; offset < buf + buf_len; offset++) {
                randSeed = 398184 + (randSeed * 2320341) % 0xFFFFFFF;
                byteArray[offset] = randSeed & 0xFF;
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

        fd_fdstat_set_flags: () => { throw Error('fd_fdstat_set_flags'); },
        fd_prestat_get: () => ErrNo.BADF,
        fd_prestat_dir_name: () => ErrNo.BADF,
        path_open: () => { throw Error('path_open'); },
        path_remove_directory: () => { throw Error('path_remove_directory'); },
        path_unlink_file: () => { throw Error('path_unlink_file'); },
    };
};

enum ErrNo {
    SUCCESS = 0,
    TOOBIG = 1,
    ACCES = 2,
    ADDRINUSE = 3,
    ADDRNOTAVAIL = 4,
    AFNOSUPPORT = 5,
    AGAIN = 6,
    ALREADY = 7,
    BADF = 8,
    BADMSG = 9,
    BUSY = 10,
    CANCELED = 11,
    CHILD = 12,
    CONNABORTED = 13,
    CONNREFUSED = 14,
    CONNRESET = 15,
    DEADLK = 16,
    DESTADDRREQ = 17,
    DOM = 18,
    DQUOT = 19,
    EXIST = 20,
    FAULT = 21,
    FBIG = 22,
    HOSTUNREACH = 23,
    IDRM = 24,
    ILSEQ = 25,
    INPROGRESS = 26,
    INTR = 27,
    INVAL = 28,
    IO = 29,
    ISCONN = 30,
    ISDIR = 31,
    LOOP = 32,
    MFILE = 33,
    MLINK = 34,
    MSGSIZE = 35,
    MULTIHOP = 36,
    NAMETOOLONG = 37,
    NETDOWN = 38,
    NETRESET = 39,
    NETUNREACH = 40,
    NFILE = 41,
    NOBUFS = 42,
    NODEV = 43,
    NOENT = 44,
    NOEXEC = 45,
    NOLCK = 46,
    NOLINK = 47,
    NOMEM = 48,
    NOMSG = 49,
    NOPROTOOPT = 50,
    NOSPC = 51,
    NOSYS = 52,
    NOTCONN = 53,
    NOTDIR = 54,
    NOTEMPTY = 55,
    NOTRECOVERABLE = 56,
    NOTSOCK = 57,
    NOTSUP = 58,
    NOTTY = 59,
    NXIO = 60,
    OVERFLOW = 61,
    OWNERDEAD = 62,
    PERM = 63,
    PIPE = 64,
    PROTO = 65,
    PROTONOSUPPORT = 66,
    PROTOTYPE = 67,
    RANGE = 68,
    ROFS = 69,
    SPIPE = 70,
    SRCH = 71,
    STALE = 72,
    TIMEDOUT = 73,
    TXTBSY = 74,
    XDEV = 75,
    NOTCAPABLE = 76,
};