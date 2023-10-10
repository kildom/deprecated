import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";

export class AstThrowStatement extends AstNode implements AstStatement {
    type!: 'ThrowStatement';
    argument!: AstExpression;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        this.argument.processVariables(stage);
    }
    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
