import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export type AstUnaryOperator = '-' | '+' | '!' | '~' | 'typeof' | 'void' | 'delete';

export class AstUnaryExpression extends AstNode implements AstExpression {
    type!: 'UnaryExpression';
    operator!: AstUnaryOperator;
    prefix!: boolean;
    argument!: AstExpression;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
