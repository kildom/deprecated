import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstBlockStatement } from "../ast/BlockStatement";
import { AstNode } from "../ast/Node";
import { AstStatement, ProcessVariablesStage } from "../ast/Statement";
import { AstPattern } from "../estree";
import { AstProgram } from "./Program";



export class AstTryStatement extends AstNode implements AstStatement {
    type!: 'TryStatement';
    block!: AstBlockStatement;
    handler!: AstCatchClause | null;
    finalizer!: AstBlockStatement | null;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        this.block.processVariables(stage);
        this.handler?.processVariables(stage);
        this.finalizer?.processVariables(stage);
    }

    generate(gen: BytecodeGenerator): void {
        // TODO
    }
}

export class AstCatchClause extends AstNode implements AstNode {
    type!: 'CatchClause';
    param!: AstPattern | null;    // since ES2019
    //     AstPattern;
    body!: AstBlockStatement;
    processVariables(stage: ProcessVariablesStage): void {
        // TODO: this.param.processVariables(stage);
        this.body.processVariables(stage);
    }
}
