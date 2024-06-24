import assert from 'assert';
import { createWasiImports } from "./wasi-stubs";
import fs from 'node:fs';
import cre from 'con-reg-exp';
import * as parser from './binary-parser';
import { run } from "../scripts-common";

function errorFunction() {
    throw new Error('Unexpected call.');
}


export interface UnprocessedSandboxWasmExports {
    memory: WebAssembly.Memory;
    __stack_pointer: WebAssembly.Global;
    _start(): void;
};


let initialMemoryPages = 0;
let exports: any;

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

    entry: () => {
        console.log('Entry reached');
        throw new Error('OK');
    },

    getMemorySize: () => {
        let res = 65536 * initialMemoryPages;
        console.log(`Get memory size: ${res}`);
        return res;
    },

    getStackPointer: () => {
        let res = exports?.__stack_pointer?.value ? exports.__stack_pointer.value : exports.getStackPointer();
        console.log(`Stack pointer: ${res}`);
        return res;
    },
};

interface ExecutionState {
    stackPointer: number;
    memory: Uint8Array;
}


async function executeStartup(bin: Uint8Array, pages: number): Promise<ExecutionState> {
    initialMemoryPages = pages;
    let mod = await WebAssembly.compile(bin);
    let wasi = createWasiImports();
    // WASI-SDK libc requires initial memory exactly as declared in module. Giving more causes memory leaks.
    let memory = new WebAssembly.Memory({ initial: initialMemoryPages });
    console.log(`Starting module with ${memory.buffer.byteLength / 65536} pages`);
    let imports = {
        sandbox: sandboxImports,
        wasi_snapshot_preview1: wasi,
        env: { memory },
    };
    let inst = await WebAssembly.instantiate(mod, imports as any);
    exports = inst.exports as unknown as UnprocessedSandboxWasmExports;
    wasi.setMemory(memory);
    try {
        exports._start();
        throw new Error('Module startup failed');
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

enum OptimizeMode {
    None = 0,
    Optimize = 1,
    Size = 2,
};

async function main() {

    // Process parameters
    let wasmOpt = process.env['WASM_OPT_PATH'] || 'wasm-opt';
    let wasm2wat = process.env['WASM2WAT_PATH'] || 'wasm2wat';
    if (process.argv.length !== 5) {
        console.error(`Usage: ${process.argv[1]} -O[0123sz] input.wasm output.wasm`);
        process.exit(99);
    }
    let args = {
        opt: process.argv[2],
        input: process.argv[3],
        output: process.argv[4],
    };
    let optimize = args.opt.endsWith('0') ? OptimizeMode.None :
        args.opt.endsWith('z') || args.opt.endsWith('s') ? OptimizeMode.Size :
        OptimizeMode.Optimize;

    // Read input
    let moduleBin = fs.readFileSync(args.input) as Uint8Array;

    // Execute WASM module startup and initialization code
    let limits = parser.getImportMemoryLimits(moduleBin);
    let state = await executeStartup(moduleBin, limits.initialPages);

    // Rewrite module, so it contains current state now
    moduleBin = parser.rewriteModule(moduleBin, state.memory, state.stackPointer, optimize == OptimizeMode.Size);

    // Optimize again since the startup functions can be discarded now
    if (optimize !== OptimizeMode.None) {
        fs.writeFileSync(args.output + '.proc.wasm', moduleBin);
        run(
            wasmOpt,
            args.opt,
            '-o', args.output + '.opt.wasm',
            args.output + '.proc.wasm'
        );
        moduleBin = fs.readFileSync(args.output + '.opt.wasm');
    }

    // Add custom sections containing information needed for freeze functionality
    moduleBin = parser.addModuleInfo(moduleBin);

    // Write final output
    fs.writeFileSync(args.output, moduleBin);

    // Make sure there are no forbidden instructions (not supported by freeze functionality)
    run(
        wasm2wat,
        '-o', args.output + '.wat',
        args.input,
    );
    let text = fs.readFileSync(args.output + '.wat', 'utf8');
    for (let line of text.split('\n')) {
        assert.doesNotMatch(line, forbiddenInstr);
    }

    // Remove temporary files
    fs.unlinkSync(args.output + '.wat');
    try {
        fs.unlinkSync(args.output + '.opt.wasm');
        fs.unlinkSync(args.output + '.proc.wasm');
    } catch (e) { }
}

main();
