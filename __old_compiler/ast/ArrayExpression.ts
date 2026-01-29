import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";
import { AstSpreadElement } from "./SpreadElement";


export class AstArrayExpression extends AstNode implements AstExpression {
    type!: 'ArrayExpression';
    elements!: (AstExpression | AstSpreadElement | null)[];
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
