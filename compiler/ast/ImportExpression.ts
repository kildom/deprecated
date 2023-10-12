import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export class AstImportExpression extends AstNode implements AstExpression {
    type!: 'ImportExpression';
    source!: AstExpression;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }    // since ES2020
}
