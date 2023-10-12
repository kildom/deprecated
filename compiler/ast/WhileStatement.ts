import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";


export class AstWhileStatement extends AstWithLabel implements AstStatement {
    type!: 'WhileStatement';
    test!: AstExpression;
    body!: AstStatement;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        //TODO
    }
}

export class AstDoWhileStatement extends AstWithLabel implements AstStatement {
    type!: 'DoWhileStatement';
    body!: AstStatement;
    test!: AstExpression;
    parent!: AstProgram;


    generate(gen: BytecodeGenerator): void {
        //TODO
    }
}
