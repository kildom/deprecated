import * as util from "node:util";
import acorn from "acorn";
import { AstProgram } from "./ast/Program";
import { ECMA_VERSION_NUMBER } from "./constants";
import { DumpSink } from "./DumpSink";
import { NodeConverter } from "./ast/common";



export class Application {

    public modules = new Map<string, AstProgram>();

    constructor() {
    }

    public parse(fileName: string, moduleName: string, sourceCode: string) {

        let converter = new NodeConverter(this);

        let program = acorn.Parser.parse(sourceCode, {
            ecmaVersion: ECMA_VERSION_NUMBER,
            sourceType: "module",
            allowAwaitOutsideFunction: true,
            allowHashBang: true,
            directSourceFile: fileName,
        });

        converter.convert(program, program);

        this.modules.set(moduleName, program as AstProgram);
    }

    public compile() {
        for (let [moduleName, module] of this.modules) {
            //console.log(util.inspect(module, false, null, true /* enable colors */))
            module.scanPostInit();
            module.scanStrict();
            module.scanCollectVariables();
        }
    }

    public dump() {
        let sink = new DumpSink();
        for (let [name, mod] of this.modules) {
            sink.log('Module', name);
            sink.sub(mod);
        }
        sink.finalize();
    }

};
