import assert from 'assert';
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
    call: errorFunction as any,
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

    getTime: (realTime: number) => {
        return realTime !== 0 ? 1718795365619n : 1000n;
    },

    getRandom(ptr: number, len: number) {
        console.log(`Get random: ${ptr}, ${len}`);
    },

    exit(code: number) {
        throw new Error(`Unexpected exit with code: ${code}`);
    },
};

interface ExecutionState {
    stackPointer: number;
    memory: Uint8Array;
}


async function executeStartup(bin: Uint8Array, pages: number): Promise<ExecutionState> {
    initialMemoryPages = pages;
    let mod = await WebAssembly.compile(bin);
    // WASI-SDK libc requires initial memory exactly as declared in module. Giving more causes memory leaks.
    let memory = new WebAssembly.Memory({ initial: initialMemoryPages });
    console.log(`Starting module with ${memory.buffer.byteLength / 65536} pages`);
    let imports: Record<string, any> = {
        env: { memory, ...sandboxImports },
    };
    for (let exp of WebAssembly.Module.exports(mod)) {
        if (exp.name.startsWith('__dependency_module_hex:')) {
            let [_tag, name, hex] = exp.name.split(':');
            const modBytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < modBytes.length; i++) {
                const byte = hex.substring(i * 2, i * 2 + 2);
                modBytes[i] = parseInt(byte, 16);
            }
            const dep = (await WebAssembly.instantiate(modBytes, imports)).instance;
            imports[name] = dep.exports;
        }
    }
    let inst = await WebAssembly.instantiate(mod, imports as any);
    exports = inst.exports as unknown as UnprocessedSandboxWasmExports;
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

function checkForbidden(watPath: string) {
    let fd = fs.openSync(watPath, 'r');
    try {
        let dec = new TextDecoder();
        let buffer = new Uint8Array(2 * 1024 * 1024);
        buffer.fill(32);
        do {
            let bytes = fs.readSync(fd, buffer, 0, 1024 * 1024, null);
            if (bytes === 0) break;
            if (bytes < 0) throw new Error('Read error');
            let text = dec.decode(buffer.subarray(0, bytes));
            assert.doesNotMatch(text, forbiddenInstr);
            buffer.copyWithin(0, 1024 * 1024, 2 * 1024 * 1024);
        } while (true);
    } finally {
        fs.closeSync(fd);
    }
}

enum OptimizeMode {
    None = 0,
    Optimize = 1,
    Size = 2,
};

async function main() {

    // Process parameters
    let wasmOpt = process.env['WASM_OPT_PATH'] || 'wasm-opt';
    let wasm2wat = process.env['WASM2WAT_PATH'] || 'wasm2wat';
    let wasmMetadce = process.env['WASM_METADCE_PATH'] || 'wasm-metadce';
    if (process.argv.length !== 6) {
        console.error(`Usage: ${process.argv[1]} -O[0123sz] input.wasm output.wasm wasi-stubs.wasm`);
        process.exit(99);
    }
    let args = {
        opt: process.argv[2],
        input: process.argv[3],
        output: process.argv[4],
        wasiStubs: process.argv[5],
    };
    let optimize = args.opt.endsWith('0') ? OptimizeMode.None :
        args.opt.endsWith('z') || args.opt.endsWith('s') ? OptimizeMode.Size :
        OptimizeMode.Optimize;

    // Make sure there are no forbidden instructions (not supported by freeze or pre-startup functionality)
    run(
        wasm2wat,
        '-o', args.output + '.wat',
        args.input,
    );
    checkForbidden(args.output + '.wat')

    // Read input
    let moduleBin = fs.readFileSync(args.input) as Uint8Array;

    // Execute WASM module startup and initialization code
    let limits = parser.getImportMemoryLimits(moduleBin);
    let state = await executeStartup(moduleBin, limits.initialPages);

    // Rewrite module, so it contains current state now
    moduleBin = parser.rewriteModule(moduleBin, state.memory, state.stackPointer, optimize == OptimizeMode.Size);

    // Optimize again since the startup and WASI functions can be discarded now
    if (optimize !== OptimizeMode.None) {
        let wasiNames = new Set(WebAssembly.Module.exports(await WebAssembly.compile(fs.readFileSync(args.wasiStubs))).map(exp => exp.name));
        wasiNames.add('stdoutWrite');
        wasiNames.add('memory');
        let sandboxNames = new Set(WebAssembly.Module.exports(await WebAssembly.compile(moduleBin)).map(exp => exp.name));
        let remainingNames = [...sandboxNames].filter(name => !wasiNames.has(name));
        let graph: any = [{ 
            "name": "outside",
            "reaches": [],
            "root": true,
        }];
        for (let name of remainingNames) {
            graph[0].reaches.push(`export-${name}`);
            graph.push({
                "name": `export-${name}`, 
                "export": name,
            });
        }
        fs.writeFileSync(args.output + '.graph.json', JSON.stringify(graph, null, 2));
        fs.writeFileSync(args.output + '.proc.wasm', moduleBin);
        run(
            wasmMetadce,
            args.output + '.proc.wasm',
            '--graph-file', args.output + '.graph.json',
            '-o', args.output + '.no-wasi.wasm',
        );
        run(
            wasmOpt,
            args.opt,
            '-o', args.output + '.opt.wasm',
            args.output + '.no-wasi.wasm'
        );
        moduleBin = fs.readFileSync(args.output + '.opt.wasm');
    }

    // Write final output
    fs.writeFileSync(args.output, moduleBin);

    // Remove temporary files
    //fs.unlinkSync(args.output + '.wat');
    try {
        fs.unlinkSync(args.output + '.opt.wasm');
        fs.unlinkSync(args.output + '.proc.wasm');
        fs.unlinkSync(args.output + '.no-wasi.wasm');
        fs.unlinkSync(args.output + '.graph.json');
    } catch (e) { }
}

main();
