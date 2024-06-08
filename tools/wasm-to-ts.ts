
import * as fs from 'node:fs';
import * as child_process from 'node:child_process';
import cre from 'con-reg-exp';


function fatal(text: string): never {
    console.error(text);
    process.exit(1);
}

function run(...args: string[]) {
    let out = child_process.spawnSync(args[0], args.slice(1), { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    if (out.status !== 0) fatal(`"wasm-objdump" command failed:\n${out.stderr}\n${out.stdout}`);
    return out.stdout;
}

function filterLines(text: string) {
    return text
        .split('\n')
        .map(x => x.trimEnd())
        .filter(x => x.trim())
        .filter(x => x.startsWith(' - '));
}

type WasmType = 'i32' | 'i64' | 'f32' | 'f64' | 'nil';

const typeMapping: { [key: string]: string } = {
    i32: 'number',
    i64: 'bigint',
    f32: 'number',
    f64: 'number',
    nil: 'void',
};

const wasmTypeRegExp = cre`
    "i32" or "i64" or "f32" or "f64" or "nil"
`;

const typeRegExp = cre`
    // - type[98] (i32, i32, i32, i64) -> nil
    begin-of-text
    " - type["
    repeat whitespace
    index: at-least-1 digit
    repeat whitespace
    "]"
    repeat whitespace
    "("
    repeat whitespace
    params: optional {
        ${wasmTypeRegExp}
        repeat whitespace
        repeat {
            ","
            repeat whitespace
            ${wasmTypeRegExp}
            repeat whitespace
        }
    }
    ")"
    repeat whitespace
    "->"
    repeat whitespace
    result: ${wasmTypeRegExp}
    repeat whitespace
    end-of-text
`;

const importRegExp = cre`
    // - func[0] sig=13 <cleanValues> <- sandbox.cleanValues
    begin-of-text
    " - func["
    repeat whitespace
    index: at-least-1 digit
    repeat whitespace
    "]"
    repeat whitespace
    "sig="
    type: at-least-1 digit
    lazy-repeat any
    "<-"
    name: repeat any
    end-of-text
`;

const exportMemRegExp = cre`
    // - memory[0] -> "memory"
    begin-of-text
    " - memory["
    lazy-repeat any
    "->"
    memName: repeat any
    end-of-text
`;

const exportFuncRegExp = cre`
    // - func[30] <_start> -> "_start"
    begin-of-text
    " - func["
    repeat whitespace
    funcIndex: at-least-1 digit
    lazy-repeat any
    "->"
    funcName: repeat any
    end-of-text
`;

const FuncDeclRegExp = cre`
    // - func[37] sig=2 <cleanValuesFunc(JSContext*, unsigned int, JS::Value*)>
    begin-of-text
    " - func["
    repeat whitespace
    index: at-least-1 digit
    repeat whitespace
    "]"
    repeat whitespace
    "sig="
    type: at-least-1 digit
`;

function trimQuotes(text: string) {
    return text.replace(/^\s*"?\s*|\s*"?\s*$/g, '');
}

type FuncType = { params: WasmType[], result: WasmType };

let types: FuncType[] = [];
let imports: { name: string, type: FuncType }[] = [];
let funcDecls: FuncType[] = [];
let memExports: string[] = [];
let funcExports: { name: string, type: FuncType }[] = [];

function parseInterface(file: string) {
    let out = run('../wabt-1.0.35/bin/wasm-objdump',
        '-j', 'type',
        '-x', file,
    );
    for (let line of filterLines(out)) {
        let groups = line.match(typeRegExp)?.groups;
        if (!groups) fatal(`Cannot parse line: ${line}`);
        types[parseInt(groups.index)] = {
            params: groups.params.split(/\s*,\s*/).filter(x => x) as WasmType[],
            result: groups.result as WasmType,
        };
    }

    out = run('../wabt-1.0.35/bin/wasm-objdump',
        '-j', 'import',
        '-x', file,
    );
    for (let line of filterLines(out)) {
        let groups = line.match(importRegExp)?.groups;
        if (!groups) fatal(`Cannot parse line: ${line}`);
        imports[parseInt(groups.index)] = {
            type: types[parseInt(groups.type)],
            name: trimQuotes(groups.name),
        };
    }

    out = run('../wabt-1.0.35/bin/wasm-objdump',
        '-j', 'function',
        '-x', file,
    );
    for (let line of filterLines(out)) {
        let groups = line.match(FuncDeclRegExp)?.groups;
        if (!groups) fatal(`Cannot parse line: ${line}`);
        funcDecls[parseInt(groups.index)] = types[parseInt(groups.type)];
    }

    out = run('../wabt-1.0.35/bin/wasm-objdump',
        '-j', 'export',
        '-x', file,
    );
    for (let line of filterLines(out)) {
        let groups = line.match(exportMemRegExp)?.groups || line.match(exportFuncRegExp)?.groups;
        if (!groups) fatal(`Cannot parse line: ${line}`);
        if (groups.memName) {
            memExports.push(trimQuotes(groups.memName));
        } else {
            let index = parseInt(groups.funcIndex);
            if (!funcDecls[index]) fatal(`Cannot get type for export: ${groups.funcName}`);
            funcExports.push({
                type: funcDecls[index],
                name: trimQuotes(groups.funcName),
            });
        }
    }
}

function getWasmFile() {
    let all: string[] = [];
    let file = 'release/sandbox.opt.wasm';
    if (fs.existsSync(file)) all.push(file);
    file = 'quickbuild/sandbox.wasm';
    if (fs.existsSync(file)) all.push(file);
    file = 'debug/sandbox.wasm';
    if (fs.existsSync(file)) all.push(file);
    if (all.length != 1) fatal(`No input file or ambiguous: ${all}`);
    return all[0];
}

function formatParams(params: WasmType[]) {
    const names = 'abcdefghijklmnopqrstuvwxyz';
    return params.map((x, i) => `${names[i]}: ${typeMapping[x]}`).join(', ');
}


function generateInterface() {
    let result: string[] = [];
    let importIface: string[] = [];
    result.push(`export interface SandboxWasmExport {`);
    for (let exp of memExports) {
        result.push(`    ${exp}: WebAssembly.Memory;`);
    }
    for (let exp of funcExports) {
        result.push(`    ${exp.name}(${formatParams(exp.type.params)}): ${typeMapping[exp.type.result]};`);
    }
    result.push(`};\n`);
    let modules = new Set(imports.map(x => x.name.split('.')[0]));
    result.push(`export namespace SandboxWasmImportModule {`);
    for (let mod of modules) {
        result.push(`    export interface ${mod} {`);
        for (let imp of imports) {
            if (!imp.name.startsWith(mod + '.')) continue;
            result.push(`        ${imp.name.substring(mod.length + 1)}(${formatParams(imp.type.params)}): ${typeMapping[imp.type.result]};`);
        }
        result.push(`    };`);
        importIface.push(`    ${mod}: SandboxWasmImportModule.${mod};`);
    }
    result.push(`};\n`);
    result.push(`export interface SandboxWasmImport {`);
    result.push(...importIface);
    result.push(`};\n`);
    return result.join('\n');
}

let file = getWasmFile();

parseInterface(file);
let code = generateInterface();

fs.writeFileSync('src-host/wasm-interface.ts', `/*
 * Code automatically generated with the "wasm-to-ts.mts" script.
 * Run "npm run wasm-to-ts" to regenerate it. Do not edit manully.
 */

${code}`);
