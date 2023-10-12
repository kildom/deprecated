import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";

export class AstMetaProperty extends AstNode implements AstExpression {
    type!: 'MetaProperty';
    meta!: AstIdentifier;
    property!: AstIdentifier;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
