import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstPrivateIdentifier } from "./Class";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export type AstBinaryOperator = '==' | '!=' | '===' | '!==' | '<' | '<=' | '>' | '>=' | '<<' | '>>' | '>>>' | '+' | '-' | '*' | '/' | '%' | '|' | '^' | '&' | 'in' | 'instanceof' | /* since ES2016: */ '**';

export class AstBinaryExpression extends AstNode implements AstExpression {
    type!: 'BinaryExpression';
    operator!: AstBinaryOperator;
    left!: AstExpression | AstPrivateIdentifier;
    right!: AstExpression;
    parent!: ExpressionParent;


    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
