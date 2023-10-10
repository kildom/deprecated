
import { AstNode } from "./Node";
import { AstStatement, ProcessVariablesStage } from "./Statement";
import { AstFunctionBody, AstImportOrExportDeclaration, AstPattern } from "../estree";
import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstIdentifier } from "./Identifier";
import { AstExpression } from "./Expression";
import { AstFunctionBase } from "./FunctionBase";


export class AstProgram extends AstFunctionBase {
    type!: 'Program';
    body!: (AstStatement | AstImportOrExportDeclaration)[];
    sourceType!: 'script' | 'module';

    constructor() {
        super();
        this.id = null;
        this.params = [];
        this.generator = false;
        this.async = true;
    }

    protected initialize() {
        this.setParent(this.body);
        if (this.sourceType === 'script') {
            throw new Error(`Script mode not supported.`);
        }
    }

    processVariables(stage: ProcessVariablesStage): void {
        for (const statement of this.body) {
            statement.processVariables(stage);
        }
    }

    public generate(gen: BytecodeGenerator) {
        for (const statement of this.body) {
            statement.generate(gen);
        }
    }
    
    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('sourceType:', this.sourceType);
        out.log('body:');
        out.sub(this.body);
    }
}
