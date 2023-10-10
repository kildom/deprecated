import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";

export class AstSwitchStatement extends AstWithLabel implements AstStatement {
    type!: 'SwitchStatement';
    discriminant!: AstExpression;
    cases!: AstSwitchCase[];
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        this.discriminant.processVariables(stage);
        for (let c of this.cases) {
            c.processVariables(stage);
        }
    }

    generate(gen: BytecodeGenerator): void {
        // TODO
    }
}

export class AstSwitchCase extends AstNode {
    type!: 'SwitchCase';
    test!: AstExpression | null;
    consequent!: AstStatement[];
    parent!: AstSwitchStatement;

    processVariables(stage: ProcessVariablesStage): void {
        this.test?.processVariables(stage);
        for (let c of this.consequent) {
            c.processVariables(stage);
        }
    }
}
