import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";
import { AstProperty } from "./Property";
import { AstSpreadElement } from "./SpreadElement";



export class AstObjectExpression extends AstNode implements AstExpression {
    type!: 'ObjectExpression';
    properties!: (AstProperty | AstSpreadElement)[];
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
