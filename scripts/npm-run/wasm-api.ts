
import * as fs from 'node:fs';
import * as child_process from 'node:child_process';
import cre from 'con-reg-exp';
import assert from 'node:assert';
import { exportInfoPrefix } from '../../src-common/common';


let inputs: string[];
let output: string;
let comment: string;

if (process.argv[2] === 'unprocessed') {
    inputs = [
        'build/debug/sandbox.wasm',
        'build/release/sandbox.wasm',
        'build/size/sandbox.wasm',
    ];
    output = 'scripts/postprocess-wasm/wasm-interface-unprocessed.ts';
    comment = '/*\n * Code was automatically generated. Do not edit manually.\n * Run "npm run wasm-api unprocessed" to regenerate it.\n */\n\n';
} else {
    inputs = [
        'dist/debug.wasm',
        'dist/release.wasm',
        'dist/size.wasm',
    ];
    output = 'src-wasm/wrapper/wasm-interface.ts';
    comment = '/*\n * Code was automatically generated. Do not edit manually.\n * Run "npm run wasm-api" to regenerate it.\n */\n\n';
}


const wasm_objdump = process.env['WASM_OBJDUMP_PATH'] || 'wasm-objdump';

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

const importFuncRegExp = cre`
    // - func[0] sig=13 <clearValues> <- sandbox.clearValues
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

const importMemRegExp = cre`
    // - memory[0] pages: initial=70 <- env.memory
    begin-of-text
    " - memory["
    repeat whitespace
    index: at-least-1 digit
    repeat whitespace
    "]"
    repeat whitespace
    "pages:"
    repeat whitespace
    "initial="
    pages: at-least-1 digit
    lazy-repeat any
    "<-"
    memName: repeat any
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

const exportGlobalExp = cre`
    // - global[0] -> "__stack_pointer"
    begin-of-text
    " - global["
    lazy-repeat any
    "->"
    globalName: repeat any
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
    // - func[37] sig=2 <clearValuesFunc(JSContext*, unsigned int, JS::Value*)>
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

type FuncType = { params: WasmType[], result: WasmType, paramNames?: { prefix: string, name: string, suffix: string }[], returnType?: string };

type Dict<T> = {[key:string]: T}

let types: FuncType[] = [];
let imports: Dict<FuncType> = {};
let funcDecls: FuncType[] = [];
let funcExports: Dict<{ name: string, type: FuncType, counter: number }> = {};
let memExports = new Set<string>();
let globalExports = new Set<string>();
let memImports = new Set<string>();
let variantCounter = 0;

function assertTypeEqual(a: FuncType, b: FuncType) {
    assert(a.result === b.result && a.params.join(', ') === b.params.join(', '));
}

function parseInterface(file: string, mode: string) {

    types = [];
    funcDecls = [];
    variantCounter++;

    let out = run(wasm_objdump,
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

    out = run(wasm_objdump,
        '-j', 'import',
        '-x', file,
    );
    for (let line of filterLines(out)) {
        let groups = line.match(importFuncRegExp)?.groups || line.match(importMemRegExp)?.groups;
        if (!groups) fatal(`Cannot parse line: ${line}`);
        if (groups.memName) {
            memImports.add(trimQuotes(groups.memName));
        } else {
            let type = types[parseInt(groups.type)];
            let name = trimQuotes(groups.name);
            if (name in imports) assertTypeEqual(type, imports[name]);
            imports[name] = type;
        }
    }

    out = run(wasm_objdump,
        '-j', 'function',
        '-x', file,
    );
    for (let line of filterLines(out)) {
        let groups = line.match(FuncDeclRegExp)?.groups;
        if (!groups) fatal(`Cannot parse line: ${line}`);
        funcDecls[parseInt(groups.index)] = types[parseInt(groups.type)];
    }

    out = run(wasm_objdump,
        '-j', 'export',
        '-x', file,
    );
    for (let line of filterLines(out)) {
        let groups = line.match(exportGlobalExp)?.groups || line.match(exportMemRegExp)?.groups || line.match(exportFuncRegExp)?.groups;
        if (!groups) fatal(`Cannot parse line: ${line}`);
        if (groups.globalName) {
            globalExports.add(trimQuotes(groups.globalName));
        } else if (groups.memName) {
            memExports.add(trimQuotes(groups.memName));
        } else {
            let index = parseInt(groups.funcIndex);
            if (!funcDecls[index]) fatal(`Cannot get type for export: ${groups.funcName}`);
            let type = funcDecls[index];
            let name = trimQuotes(groups.funcName);
            if (name.startsWith(exportInfoPrefix)) continue;
            if (name in funcExports) {
                assertTypeEqual(type, funcExports[name].type);
                funcExports[name].counter++;
            } else {
                funcExports[name] = { counter: 1, name, type };
            }
        }
    }
}

const cppFunctionRegExp = cre.global`
    // WASM_EXPORT(init)
    "WASM_"
    type: ("EXPORT" or "IMPORT")
    "("
    name: lazy-repeat any
    ")"
    returnType: lazy-repeat any
    repeat [a-zA-Z0-9_]
    "("
    params: lazy-repeat any
    ")"
`;

function parseHeader(file: string) {
    let text = fs.readFileSync(file, 'utf-8');
    for (let m of text.matchAll(cppFunctionRegExp)) {
        let groups = m.groups as {
            type: 'EXPORT' | 'IMPORT';
            name: string;
            params: string;
            returnType: string;
        };
        let returnType = groups.returnType.trim();
        let name = groups.name.trim();
        let params = groups.params.split(',')
            .map(x => {
                let arr = x.trim().split(/([_a-z0-9]+)/i);
                if (arr.length == 1) return undefined;
                let suffix = arr.pop()!.trim();
                let name = arr.pop()!;
                let prefix = arr.join('').trim();
                return { prefix, name, suffix };
            })
            .filter(x => x)
            .map(x => x!);
        if (groups.type === 'EXPORT') {
            let func = funcExports[name];
            if (!func) {
                console.error('Missing export', name);
                continue;
            }
            if (func.type.params.length !== params.length) {
                console.error('Invalid count of parameters', name);
                continue;
            }
            func.type = {
                ...func.type,
                paramNames: params,
                returnType: returnType,
            };
        } else {
            let fullName = `env.${name}`;
            let func = imports[fullName];
            if (!func) {
                console.error('Missing import', fullName);
                continue;
            }
            if (func.params.length !== params.length) {
                console.error('Invalid count of parameters', fullName);
                continue;
            }
            imports[fullName] = {
                ...func,
                paramNames: params,
                returnType: returnType,
            };
        }
        //console.log(returnType, name, params);
    }
}

function formatParams(params: FuncType) {
    if (!params.paramNames) {
        const names = 'abcdefghijklmnopqrstuvwxyz';
        return params.params.map((x, i) => `${names[i]}: ${typeMapping[x]}`).join(', ');
    } else {
        return params.params.map((x, i) => {
            let paramName = params.paramNames![i];
            if (paramName.suffix) {
                return `/* ${paramName.prefix} */ ${paramName.name} /* ${paramName.suffix} */: ${typeMapping[x]}`;
            } else {
                return `/* ${paramName.prefix} */ ${paramName.name}: ${typeMapping[x]}`;
            }
        }).join(', ');
    }
}


function generateInterface() {
    let lic = ('\n' + fs.readFileSync('LICENSE.txt', 'utf-8').trim() + '\n')
        .split('\n')
        .map(x => (' * ' + x).trimEnd())
        .join('\n')
        .trim();
    let result: string[] = [`/${lic}/\n\n\n${comment}`];
    let importIface: string[] = [];
    result.push(`export interface SandboxWasmExport {`);
    for (let exp of memExports) {
        result.push(`    ${exp}: WebAssembly.Memory;`);
    }
    for (let exp of globalExports) {
        result.push(`    ${exp}: any;`);
    }
    for (let exp of Object.values(funcExports)) {
        let line = `    ${exp.name}`;
        if (exp.counter !== variantCounter) {
            line += `?: (${formatParams(exp.type)}) =>`;
        } else {
            line += `(${formatParams(exp.type)}):`;
        }
        if (exp.type.returnType && exp.type.result !== 'nil') {
            line += ` /* ${exp.type.returnType} */`;
        }
        line += ` ${typeMapping[exp.type.result]}`
        line += ';';
        result.push(line);
    }
    result.push(`};\n`);
    let modules = new Set([
        ...Object.entries(imports).map(x => x[0].split('.')[0]),
        ...[...memImports].map(x => x.split('.')[0]),
    ]);
    result.push(`export namespace SandboxWasmImportModule {`);
    for (let mod of modules) {
        result.push(`    export interface ${mod} {`);
        for (let mem of memImports) {
            if (!mem.startsWith(mod + '.')) continue;
            result.push(`        ${mem.substring(mod.length + 1)}: WebAssembly.Memory;`);
        }
        for (let [name, type] of Object.entries(imports)) {
            if (!name.startsWith(mod + '.')) continue;
            result.push(`        ${name.substring(mod.length + 1)}(${formatParams(type)}): ${typeMapping[type.result]};`);
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

for (let path of inputs) {
    let m = path.match(/.*[/\\](.+)\.wasm$/);
    parseInterface(path, m![1]);
}

parseHeader('src-wasm/api.h');

let code = generateInterface();

fs.writeFileSync(output, code);
