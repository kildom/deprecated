
import { AstNode } from "./Node";
import { AstStatement} from "./Statement";
import { AstImportOrExportDeclaration, AstPattern } from "./common";
import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstIdentifier } from "./Identifier";
import { AstExpression } from "./Expression";
import { AstFunctionBase } from "./Function";


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
        if (this.sourceType === 'script') {
            throw new Error(`Script mode not supported.`);
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
