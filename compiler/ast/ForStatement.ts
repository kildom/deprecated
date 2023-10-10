import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";
import { AstVariableDeclaration } from "./VariableDeclaration";

export class AstForStatement extends AstWithLabel implements AstStatement {
    type!: 'ForStatement';
    init!: AstVariableDeclaration | AstExpression | null;
    test!: AstExpression | null;
    update!: AstExpression | null;
    body!: AstStatement;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        this.init?.processVariables(stage);
        this.test?.processVariables(stage);
        this.update?.processVariables(stage);
        this.body?.processVariables(stage);
    }

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
