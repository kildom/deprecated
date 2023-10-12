import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";
import { AstSpreadElement } from "./SpreadElement";

export class AstNewExpression extends AstNode implements AstExpression {
    type!: 'NewExpression';
    callee!: AstExpression;
    arguments!: (AstExpression | AstSpreadElement)[];
    parent!: ExpressionParent;


    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
