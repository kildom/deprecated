import acorn from "acorn";
import { AstProgram } from "./ast/Program";
import { ECMA_VERSION_NUMBER } from "./constants";
import { convertNode } from "./ast/utils";
import { DumpSink } from "./DumpSink";
import { ProcessVariablesStage } from "./ast/Statement";


export class Application {

    public modules = new Map<string, AstProgram>();

    constructor() {
    }

    public parse(fileName: string, moduleName: string, sourceCode: string) {

        let parser = new acorn.Parser({
            ecmaVersion: ECMA_VERSION_NUMBER,
            sourceType: "module",
            allowAwaitOutsideFunction: true,
            allowHashBang: true,
            directSourceFile: fileName,
        }, sourceCode);

        let oldFinishNode = parser.finishNode;
        let oldFinishNodeAt = parser.finishNodeAt;

        parser.finishNode = (...args: any[]) => {
            return convertNode(oldFinishNode.apply(parser, args as any), this);
        }

        parser.finishNodeAt = (...args: any[]) => {
            return convertNode(oldFinishNodeAt.apply(parser, args as any), this);
        }

        let program = parser.parse() as AstProgram;

        this.modules.set(moduleName, program);
    }

    public compile() {
        for (let [name, mod] of this.modules) {
            mod.processVariables(ProcessVariablesStage.Collect);
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
