import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstPattern } from "../estree";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";
import { AstVariableDeclaration } from "./VariableDeclaration";


export class AstForInStatementBase extends AstWithLabel implements AstStatement {
    type!: 'ForInStatement' | 'ForOfStatement';
    left!: AstVariableDeclaration |  AstPattern;
    right!: AstExpression;
    body!: AstStatement;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        //TODO: this.left.processVariables(stage);
        this.right.parent.processVariables(stage);
        this.body.processVariables(stage);
    }
    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstForInStatement extends AstForInStatementBase {
    type: 'ForInStatement';
}
