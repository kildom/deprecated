import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export type AstLogicalOperator = '||' | '&&' | '??';

export class AstLogicalExpression extends AstNode implements AstExpression {
    type!: 'LogicalExpression';
    operator!: AstLogicalOperator;
    left!: AstExpression;
    right!: AstExpression;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
