import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement } from "./Statement";

export class AstReturnStatement extends AstNode implements AstStatement {
    type!: 'ReturnStatement';
    argument!: AstExpression | null;
    parent!: AstProgram;

    processVariables() { }

    generate(gen: BytecodeGenerator): void {
        //TODO
    }
}
