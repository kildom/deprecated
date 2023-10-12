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

        let parser = new acorn.Parser({
            ecmaVersion: ECMA_VERSION_NUMBER,
            sourceType: "module",
            allowAwaitOutsideFunction: true,
            allowHashBang: true,
            directSourceFile: fileName,
        }, sourceCode);

        let converter = new NodeConverter(this);

        let oldFinishNode = parser.finishNode;
        let oldFinishNodeAt = parser.finishNodeAt;

        parser.finishNode = (...args: any[]) => {
            return converter.convert(oldFinishNode.apply(parser, args as any));
        }

        parser.finishNodeAt = (...args: any[]) => {
            return converter.convert(oldFinishNodeAt.apply(parser, args as any));
        }

        let program = parser.parse() as AstProgram;

        this.modules.set(moduleName, program);
    }

    public compile() {
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
