import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export class AstAwaitExpression extends AstNode implements AstExpression {
    type!: 'AwaitExpression';
    argument!: AstExpression;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }    // since ES2017
}
