import * as util from "node:util";
import acorn from "acorn";
import { AstProgram } from "./ast/Program";
import { ECMA_VERSION_NUMBER } from "./constants";
import { DumpSink } from "./DumpSink";
import { NodeConverter } from "./ast/common";


interface ExtParserOptions extends acorn.Options {
    converter: NodeConverter;
};


const ExtParser = acorn.Parser.extend((BaseParser: typeof acorn.Parser): typeof acorn.Parser => {

    class NewParser extends (BaseParser as any) {

        extConverter: NodeConverter;

        constructor(options: ExtParserOptions, ...args: any[]) {
            super(options, ...args);
            this.extConverter = options.converter;
        }

        finishNode (...args: any[]) {
            return this.extConverter.convert(super.finishNode(...args));
        };

        finishNodeAt (...args: any[]) {
            return this.extConverter.convert(super.finishNodeAt(...args));
        };

        copyNode(node: acorn.Node) {
        }
    };

    return NewParser as unknown as typeof acorn.Parser;
});


export class Application {

    public modules = new Map<string, AstProgram>();

    constructor() {
    }

    public parse(fileName: string, moduleName: string, sourceCode: string) {

        let converter = new NodeConverter(this);

        let options: ExtParserOptions = {
            converter,
            ecmaVersion: ECMA_VERSION_NUMBER,
            sourceType: "module",
            allowAwaitOutsideFunction: true,
            allowHashBang: true,
            directSourceFile: fileName,
        };

        let program = ExtParser.parse(sourceCode, options) as AstProgram;

        this.modules.set(moduleName, program);
    }

    public compile() {
        for (let [moduleName, module] of this.modules) {
            console.log(util.inspect(module, false, null, true /* enable colors */))
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
