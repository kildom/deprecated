import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";

export class AstExpressionStatement extends AstNode implements AstStatement {
    type!: 'ExpressionStatement';
    expression!: AstExpression;
    directive?: string;
    parent!: AstProgram;

    protected initialize() {
        this.setParent(this.expression);
    }

    generate(gen: BytecodeGenerator) {
        this.expression.generate(gen);
        gen.emitPop();
    }

    dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('directive:', this.directive)
            .log('expression:').sub(this.expression);
    }

    processVariables(stage: ProcessVariablesStage): void {
        this.expression.processVariables(stage);
    }
}
