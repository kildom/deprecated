import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";


export class AstIfStatement extends AstNode implements AstStatement {
    type!: 'IfStatement';
    test!: AstExpression;
    consequent!: AstStatement;
    alternate!: AstStatement | null;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        this.test.processVariables(stage);
        this.consequent.processVariables(stage);
        this.alternate?.processVariables(stage);
    }

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
