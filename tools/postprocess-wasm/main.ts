import assert from 'assert';
import { createWasiImports } from "./wasi-stubs";
import fs from 'node:fs';
import cre from 'con-reg-exp';
import * as parser from './binary-parser';
import * as child_process from 'node:child_process';

function errorFunction() {
    throw new Error('Unexpected call.');
}


export interface UnprocessedSandboxWasmExports {
    memory: WebAssembly.Memory;
    __stack_pointer: WebAssembly.Global;
    _start(): void;
};


const sandboxImports = {
    log: () => {},
    clearValues: errorFunction as any,
    createEngineError: errorFunction as any,
    callToHost: errorFunction as any,
    createString: errorFunction as any,
    createUndefined: errorFunction as any,
    createError: errorFunction as any,
    createNull: errorFunction as any,
    createArray: errorFunction as any,
    createObject: errorFunction as any,
    createBigInt: errorFunction as any,
    createNumber: errorFunction as any,
    createDate: errorFunction as any,
    createRegExp: errorFunction as any,
    createArrayItem: errorFunction as any,
    createObjectProperty: errorFunction as any,
    createBoolean: errorFunction as any,
    createArrayBuffer: errorFunction as any,
    createArrayBufferView: errorFunction as any,
    reuseValue: errorFunction as any,
    keepValue: errorFunction as any,
    entry: () => { throw new Error('OK'); },
};

interface ExecutionState {
    stackPointer: number;
    memory: Uint8Array;
}

function run(...args: string[]) {
    let out = child_process.spawnSync(args[0], args.slice(1), {
        stdio: 'inherit',
    });
    if (out.status !== 0) throw Error(`"${args[0]}" command failed: ${out.status}`);
}

let afterStart: number[] | undefined = undefined;
let afterInst2: number[] | undefined = undefined;

async function checkModule(info: string, bin: Uint8Array, callStart: boolean): Promise<ArrayBuffer> {
    let limits = parser.getImportMemoryLimits(bin);
    let mod = await WebAssembly.compile(bin);
    let wasi = createWasiImports();
    let memory = new WebAssembly.Memory({ initial: limits.initial });
    console.log(`${info}: Starting module with ${memory.buffer.byteLength / 65536} pages`);
    let imports = { sandbox: sandboxImports, wasi_snapshot_preview1: wasi, env: { memory } };
    let inst = await WebAssembly.instantiate(mod, imports as any);
    let result = memory.buffer.slice(0);
    if (afterStart) {
        afterInst2 = [...new Uint32Array(memory.buffer, 4 * 1024 * 1024 - 608, (memory.buffer.byteLength - (4 * 1024 * 1024 - 608)) / 4)];
        console.log(afterStart.length, afterInst2.length);
        for (let i = 0; i < afterInst2.length; i++) {
            if (afterInst2[i] != afterStart[i]) {
                console.log(4 * 1024 * 1024 - 608 + 4 * i, afterInst2[i].toString(16), afterStart[i].toString(16));
                break;
            }
        }
    }
    let exports = inst.exports as unknown as UnprocessedSandboxWasmExports;
    wasi.setMemory(memory);
    if (callStart) {
        try {
            exports._start();
        } catch (e) {
            if (e.message !== 'OK') throw e;
        }
        afterStart = [...new Uint32Array(memory.buffer, 4 * 1024 * 1024 - 608, (memory.buffer.byteLength - (4 * 1024 * 1024 - 608)) / 4)];
    }
    try {
        (exports as any).init(32 * 1024 * 1024);
    } catch (e) {
        console.error(e);
    }
    if (exports.__stack_pointer) {
        let initialStackPointer = Math.round(exports.__stack_pointer.value / 1024 / 1024) * 1024 * 1024
        console.log(`${info}: Execution ended with ${memory.buffer.byteLength / 65536} pages, C stack ${initialStackPointer - exports.__stack_pointer.value} bytes`);
    } else {
        console.log(`${info}: Execution ended with ${memory.buffer.byteLength / 65536} pages`);
    }
    return result;
}

async function executeStartup(bin: Uint8Array, initialMemoryBlocks: number): Promise<ExecutionState> {
    let mod = await WebAssembly.compile(bin);
    let wasi = createWasiImports();
    // WASI-SDK libc requires initial memory exactly as declared in module. Giving more causes memory leaks.
    let memory = new WebAssembly.Memory({ initial: initialMemoryBlocks });
    console.log(`Starting module with ${memory.buffer.byteLength / 65536} pages`);
    let imports = {
        sandbox: sandboxImports,
        wasi_snapshot_preview1: wasi,
        env: { memory },
    };
    let inst = await WebAssembly.instantiate(mod, imports as any);
    let exports = inst.exports as unknown as UnprocessedSandboxWasmExports;
    wasi.setMemory(memory);
    try {
        exports._start();
    } catch (e) {
        if (e.message !== 'OK') throw e;
    }
    let initialStackPointer = Math.round(exports.__stack_pointer.value / 1024 / 1024) * 1024 * 1024
    console.log(`Execution ended with ${memory.buffer.byteLength / 65536} pages, C stack ${initialStackPointer - exports.__stack_pointer.value} bytes`);
    return {
        stackPointer: exports.__stack_pointer.value,
        memory: new Uint8Array(memory.buffer),
    }
}

const forbiddenInstr = cre.ignoreCase`
    begin-of-text
    repeat whitespace
    "table."
    {
        "set"
        or "init"
        or "copy"
        or "grow"
        or "fill"
    }
`;

async function main() {
    let wasmOpt = process.env['WASM_OPT_PATH'] || '../binaryen-version_117/bin/wasm-opt';
    let wasm2wat = process.env['WASM2WAT_PATH'] || '../wabt-1.0.35/bin/wasm2wat';
    let sizeOptimize: boolean | null = null;
    assert.equal(process.argv.length, 5)
    sizeOptimize = process.argv[2].endsWith('z') || process.argv[2].endsWith('s');
    assert(sizeOptimize !== null);

    // Read input
    let inputBin = fs.readFileSync(process.argv[3]) as Uint8Array;

    await checkModule('TEST ORIGINAL', inputBin, true);

    let limits = parser.getImportMemoryLimits(inputBin);

    // Execute WASM module startup and initialization code
    let state = await executeStartup(inputBin, limits.initial);
    let mem1 = new Uint8Array(state.memory.buffer.slice(0));

    // Parse module and generate module containing current state
    let processedBin = parser.rewriteModule(inputBin, state.memory, state.stackPointer, sizeOptimize);
    fs.writeFileSync(process.argv[4] + '.proc.wasm', processedBin);
    let mem2 = new Uint8Array(await checkModule('TEST PROCESSED', processedBin, false));

    for (let i = state.stackPointer; i < mem2.length; i++) {
        if (mem1[i] !== mem2[i]) {
            console.log(i, `after _start: ${mem1[i]}, after inst: ${mem2[i]}`);
            throw Error();
        }
    }

    let optBin: Uint8Array;
    if (0) {
        // Optimize again, because startup function can be discarded now
        run(
            wasmOpt,
            process.argv[2],
            '-o', process.argv[4] + '.opt.wasm',
            process.argv[4] + '.proc.wasm'
        );
        optBin = fs.readFileSync(process.argv[4] + '.opt.wasm');
    } else {
        optBin = processedBin;
    }

    let finalBin = parser.parseModule(optBin);

    // Write final output
    fs.writeFileSync(process.argv[4], finalBin);

    // Make sure there are no forbidden instructions (not supported by freeze functionality)
    run(
        wasm2wat,
        '-o', process.argv[4] + '.wat',
        process.argv[3],
    );
    let text = fs.readFileSync(process.argv[4] + '.wat', 'utf8');
    for (let line of text.split('\n')) {
        assert.doesNotMatch(line, forbiddenInstr);
    }

    if (0) {
        fs.unlinkSync(process.argv[4] + '.wat');
        try {
            fs.unlinkSync(process.argv[4] + '.opt.wasm');
            fs.unlinkSync(process.argv[4] + '.proc.wasm');
        } catch (e) { }
    }
}

main();
