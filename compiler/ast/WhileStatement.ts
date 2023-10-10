import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";


export class AstWhileStatement extends AstWithLabel implements AstStatement {
    type!: 'WhileStatement';
    test!: AstExpression;
    body!: AstStatement;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        this.test.processVariables(stage);
        this.body.processVariables(stage);
    }

    generate(gen: BytecodeGenerator): void {
        //TODO
    }
}

export class AstDoWhileStatement extends AstWithLabel implements AstStatement {
    type!: 'DoWhileStatement';
    body!: AstStatement;
    test!: AstExpression;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        this.body.processVariables(stage);
        this.test.processVariables(stage);
    }

    generate(gen: BytecodeGenerator): void {
        //TODO
    }
}
