import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";


export class AstSequenceExpression extends AstNode implements AstExpression {
    type!: 'SequenceExpression';
    expressions!: AstExpression[];
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        for (let i = 0; i < this.expressions.length; i++) {
            let expression = this.expressions[i];
            expression.generate(gen);
            if (i < this.expressions.length - 1) {
                gen.emitPop();
            }
        }
    }
}
