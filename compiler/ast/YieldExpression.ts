import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export class AstYieldExpression extends AstNode implements AstExpression {
    type!: 'YieldExpression';
    argument!: AstExpression | null;
    delegate!: boolean;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
