import assert from 'assert';
import { createWasiImports } from "../../src-host/wasi-stubs";
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

async function executeStartup(bin: Uint8Array): Promise<ExecutionState> {
    let mod = await WebAssembly.compile(bin);
    let wasi = createWasiImports();
    let imports = {
        sandbox: sandboxImports,
        wasi_snapshot_preview1: wasi,
    };
    let inst = await WebAssembly.instantiate(mod, imports as any);
    let exports = inst.exports as unknown as UnprocessedSandboxWasmExports;
    wasi.setMemory(exports.memory)
    try {
        exports._start();
    } catch (e) {
        if (e.message !== 'OK') throw e;
    }
    return {
        stackPointer: exports.__stack_pointer.value,
        memory: new Uint8Array(exports.memory.buffer),
    }
}

const forbiddenInstr = cre.ignoreCase`
    begin-of-text
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

    // Execute WASM module startup and initialization code
    let state = await executeStartup(inputBin);

    // Parse module and generate module containing current state
    let processedBin = parser.rewriteModule(inputBin, state.memory, state.stackPointer, sizeOptimize);
    fs.writeFileSync(process.argv[4] + '.proc.wasm', processedBin);
    let optBin: Uint8Array;
    if (0) {
        // Optimize again, startup function can be discarded now
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

    optBin = parser.parseModule(optBin);

    // Write final output
    fs.writeFileSync(process.argv[4], optBin);

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
        } catch (e) {}
    }
}

main();
