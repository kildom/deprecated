
import * as acorn from "acorn"
import { AstProgram } from "./ast/Program";
import { AstNode } from "./ast/Node";
import { typeTable } from "./ast/typeTable";
import { Dump } from "./dump";
import { assertNever } from "./utils";
import { AstFunction } from "./ast/Function";


let sourceCode = `
    import { say } from "console";
    say?.("Hello, World!", /a/g, 12)?.test();
    function f(a, b = 2, ...rest) { }
`;


export class NodeConverter {

    private nextUid = 100000;

    constructor(
        private app: Application
    ) { }

}

export class Application {


    errors: {
        node: AstNode;
        message: string;
    }[] = [];

    error(node: AstNode, message: string) {
        throw new Error("Method not implemented.");
    }

}

let nextUid = 100000;
let finalPrototype = Object.getPrototypeOf({});

function allNonStandardPropertyNames(obj: any): string[] {
    let names = new Set<string>();
    for (let p = obj; p && p !== finalPrototype; p = Object.getPrototypeOf(p)) {
        Object.getOwnPropertyNames(p).forEach(name => names.add(name));
    }
    return [...names];
}

function convert(node: any, app: Application, program: AstProgram, func: AstFunction | null, container: AstNode | null = null, field: string): void {
    if (node === null || typeof node != 'object') {
        // Noting to do.
    } else if (node instanceof Array) {
        for (let i = 0; i < node.length; i++) {
            convert(node[i], app, program, func, container, field);
        }
    } else if (!(node.type in typeTable)) {
        for (let key of allNonStandardPropertyNames(node)) {
            convert(node[key], app, program, func, container, field);
        }
    } else if (node.app && node.uid && node.program) {
        // Already converted.
    } else {
        for (let p = Object.getPrototypeOf(node); p && p !== finalPrototype; p = Object.getPrototypeOf(p)) {
            if (Object.getOwnPropertyNames(p).filter(name => name !== 'constructor').length > 0) {
                let i = 0;
                for (let p = node; p; p = Object.getPrototypeOf(p)) {
                    console.log(`Object level ${i}:`, Object.getOwnPropertyNames(p));
                    for (let name of Object.getOwnPropertyNames(p)) {
                        try {
                            console.log(`  Property: ${name} = ${(p as any)[name].toString()}`);
                        } catch (e) {
                            console.log(`  Property: ${name} = [exception converting to string]`);
                        }
                    }
                    i++;
                }
                throw new Error("Internal error: acorn returned an object with an unexpected prototype.");
            }
        }
        let propertiesToConvert = Object.getOwnPropertyNames(node)
            .filter(name => name !== 'start' && name !== 'end' && name !== 'loc'
                && name !== 'sourceFile' && name !== 'type');
        let candidates = typeTable[node.type];
        let baseClass: any = null;
        for (let candidate of candidates) {
            if (!candidate[1] || candidate[1](node, field)) {
                baseClass = candidate[0];
                break;
            }
        }
        let proto = new baseClass();
        Object.setPrototypeOf(node, proto);
        let nodeTyped = node as AstNode;
        nodeTyped.container = container as any;
        nodeTyped.app = app;
        nodeTyped.uid = nextUid++;
        nodeTyped.program = program;
        nodeTyped.func = func;
        nodeTyped.components = [];
        nodeTyped.loc = {
            start: { ...nodeTyped.loc.start, column: nodeTyped.loc.start.column + 1 },
            end: { ...nodeTyped.loc.end, column: nodeTyped.loc.end.column + 1 },
        };
        delete node.start;
        delete node.end;
        // if DEBUG //
        nodeTyped.astDumpFields = propertiesToConvert;
        // endif //
        if (container && container.components.indexOf(node) < 0) {
            container.components.push(node);
        }

        for (let key of propertiesToConvert) {
            let subFunc = nodeTyped instanceof AstFunction ? nodeTyped as AstFunction : func;
            convert(node[key], app, program, subFunc, node, `${node.type}.${key}`);
        }

        let initList: any[] = [];
        for (let p = node; p; p = Object.getPrototypeOf(p)) {
            if (Object.getOwnPropertyNames(p).indexOf('initialize') >= 0) {
                initList.unshift(p.initialize);
            }
        }
        for (let init of initList) {
            init.call(node);
        }
    }
}

function convertProgramToFunctionBody(program: acorn.Program) {

    const importOrExports = new Set<string>([
        'ImportDeclaration',
        'ExportNamedDeclaration',
        'ExportDefaultDeclaration',
        'ExportAllDeclaration',
    ]);

    let body: any[] = [];
    let importExport: any[] = [];

    for (let item of program.body) {
        if (importOrExports.has(item.type)) {
            importExport.push(item);
        } else {
            body.push(item);
        }
    }

    (program as any).body = {
        type: "BlockStatement",
        loc: {
            start: { ...program.loc!.start },
            end: { ...program.loc!.end },
        },
        sourceFile: (program as any).sourceFile,
        body: body,
    };
    (program as any).importExport = importExport;
}

function main() {


    let astRoot = acorn.Parser.parse(sourceCode, {
        ecmaVersion: 2026,
        sourceType: "module",
        allowAwaitOutsideFunction: true,
        allowHashBang: true,
        directSourceFile: "compiler/main.ts",
        locations: true,
    });

    console.log(JSON.stringify(astRoot, null, 4));

    convertProgramToFunctionBody(astRoot);

    console.log(JSON.stringify(astRoot, null, 4));

    let app = new Application();

    convert(astRoot, app, astRoot as any, null, null, 'root');

    let program = astRoot as unknown as AstProgram;
    program.setupPass();
    program.collectVariablesPass();

    //console.log(JSON.stringify(program, null, 4));

    let d = new Dump([program as unknown as AstProgram]);
    d.dump();

    for (let err of app.errors) {
        console.error(`Error: ${err.node.sourceFile}:${err.node.loc.start.line}:${err.node.loc.start.column}: ${err.message}`);
    }


}

main();
