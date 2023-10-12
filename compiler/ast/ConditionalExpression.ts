import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export class AstConditionalExpression extends AstNode implements AstExpression {
    type!: 'ConditionalExpression';
    test!: AstExpression;
    alternate!: AstExpression;
    consequent!: AstExpression;
    parent!: ExpressionParent;


    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
