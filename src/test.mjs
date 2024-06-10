

import * as fs from 'node:fs';

let fileName;

do {
    fileName = './release/sandbox.opt.wasm';
    if (fs.existsSync(fileName)) break;
    fileName = './quickbuild/sandbox.wasm';
    if (fs.existsSync(fileName)) break;
    fileName = './debug/sandbox.wasm';
    if (fs.existsSync(fileName)) break;
} while (false);


class SandboxExit extends Error {
    constructor(code) {
        super(`Exit with code: ${code}`);
        this.code = code;
    }
}


const encoder = new TextEncoder();
const decoderUtf8 = new TextDecoder();
const decoderLatin1 = new TextDecoder('latin1');
const decoderUtf16 = new TextDecoder('utf-16le');

class SandboxEntryIsNotARealException extends Error { }


async function main() {

    /** @type WebAssembly.Memory */
    let memory;
    /** @type ArrayBuffer */
    let arrayBuffer = null;
    /** @type Uint8Array */
    let byteArray;
    /** @type DataView */
    let view;

    function updateViews() {
        if (arrayBuffer !== memory.buffer) {
            arrayBuffer = memory.buffer;
            byteArray = new Uint8Array(arrayBuffer);
            view = new DataView(arrayBuffer);
        }
    }

    let valueStack = [];
    let reusableStack = [];
    let errorState = undefined;

    let imports = {
        wasi_snapshot_preview1: {
            args_get(argv, argv_buf) {
                updateViews();
                view.setUint32(argv, argv_buf, true);
                view.setUint8(argv_buf, 48);
                view.setUint8(argv_buf + 1, 0);
                return 0;
            },
            args_sizes_get(argc, argv_buf_size) {
                updateViews();
                view.setUint32(argc, 1, true);
                view.setUint32(argv_buf_size, 2, true);
                return 0;
            },
            environ_get(environ, environ_buf) {
                return 0;
            },
            environ_sizes_get(environ_count, environ_buf_size) {
                updateViews();
                view.setUint32(environ_count, 0, true);
                view.setUint32(environ_buf_size, 0, true);
                return 0;
            },
            clock_res_get(clock_id, resolution) {
                updateViews();
                view.setUint32(resolution, 1000000, true);
                return 0;
            },
            clock_time_get(clock_id, precision, time) {
                updateViews();
                let now = Date.now();
                view.setBigUint64(time, BigInt(now) * 1000000n, true);
                return 0;
            },
            random_get(buf, buf_len) {
                updateViews();
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
            proc_exit(code) {
                throw new SandboxExit(code);
            },
        },
        sandbox: {
            entry() {
                throw new SandboxEntryIsNotARealException('entry');
            },
            clearValues() {
                console.log('Clean');
                //valueStack.splice(0);
                //reusableStack.splice(0);
                errorState = undefined;
            },
            createNull() {
                valueStack.push(null);
            },
            createBoolean(value) {
                valueStack.push(value === 0 ? false : true);
            },
            createUndefined() {
                valueStack.push(undefined);
            },
            createStringLatin1(buffer, size)
            {
                updateViews();
                console.log('createStringLatin1', new Uint8Array(arrayBuffer, buffer, size));
                valueStack.push(decoderLatin1.decode(new Uint8Array(arrayBuffer, buffer, size)));
            },
            createStringUtf16(buffer, size)
            {
                updateViews();
                console.log('createStringUtf16', new Uint8Array(arrayBuffer, buffer, size));
                valueStack.push(decoderUtf16.decode(new Uint8Array(arrayBuffer, buffer, size)));
            },
            createStringUtf8(buffer, size)
            {
                updateViews();
                console.log('createStringUtf8', new Uint8Array(arrayBuffer, buffer, size));
                valueStack.push(decoderUtf8.decode(new Uint8Array(arrayBuffer, buffer, size)));
            },
            createDate(time)
            {
                valueStack.push(new Date(time));
            },
            createNumber(num)
            {
                valueStack.push(num);
            },
            createRegExp(lastIndex) {
                if (errorState) return;
                let flags = valueStack.pop();
                let source = valueStack.pop();
                let obj = new RegExp(source, flags);
                obj.lastIndex = lastIndex;
                valueStack.push(obj);
            },
            createError() {
                if (errorState) return;
                let message = valueStack.pop();
                valueStack.push(new Error(message));
            },
            setErrorState(buffer, size)
            {
                errorState = decoderUtf8.decode(new Uint8Array(arrayBuffer, buffer, size)) || 'Error';
                updateViews();
            },
            createArray() { },
            createArrayItem() { },
            createArrayBufferView() { },
            createObject() { },
            setObjectProperty() { },
            createBigInt() { },
        },
    };
    
    let modBin = fs.readFileSync(fileName);
    let module = await WebAssembly.compile(modBin);
    let instance = new WebAssembly.Instance(module, imports);
    memory = instance.exports.memory;
    let ok = false;
    try {
        instance.exports._start();
    } catch (error) {
        if (error instanceof SandboxEntryIsNotARealException) {
            ok = true;
        } else {
            throw error;
        }
    }
    if (!ok) {
        throw new Error('Guest engine startup error!');
    }
    ok = instance.exports.init(16 * 1024 * 1024, 3) !== 0;
    if (!ok) {
        throw new Error('Guest engine initialization error!');
    }
    let sharedBufferPointer = instance.exports.getSharedBufferPointer();
    let sharedBufferSize = instance.exports.getSharedBufferSize();
    console.log(`Shared ${sharedBufferSize} @${sharedBufferPointer}`);
    updateViews();
    let info = new TextEncoder().encodeInto(`test.js\0
        __sandbox__.createString('自家晓得并且探索到');
    `, new Uint8Array(arrayBuffer, sharedBufferPointer, sharedBufferSize));
    ok = instance.exports.execute(sharedBufferPointer, info.written, 4);
    console.log(`Exec ${ok}`);
    console.log('Result', errorState || valueStack, new Date());
    console.log('OK');
};

main();
