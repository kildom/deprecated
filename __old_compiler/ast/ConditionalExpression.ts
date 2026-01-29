import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export class AstConditionalExpression extends AstNode implements AstExpression {
    declare type: 'ConditionalExpression';
    test!: AstExpression;
    alternate!: AstExpression;
    consequent!: AstExpression;
    declare parent: ExpressionParent;


    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
