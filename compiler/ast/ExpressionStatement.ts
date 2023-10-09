import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";
import { AstStatement } from "./Statement";

export class AstExpressionStatement extends AstStatement {
    type!: 'ExpressionStatement';
    expression!: AstExpression;

    protected initialize() {
        this.setParent(this.expression);
    }

    generate(gen: BytecodeGenerator) {
        this.expression.generate(gen);
        gen.emitPop();
    }
}
