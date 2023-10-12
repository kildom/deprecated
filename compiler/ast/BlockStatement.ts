import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstBlockStatementBase extends AstNode implements AstStatement {
    type!: 'BlockStatement' | 'StaticBlock';
    body!: AstStatement[];
    parent!: AstProgram;
    
    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstBlockStatement extends AstBlockStatementBase {
    type!: 'BlockStatement';
}
