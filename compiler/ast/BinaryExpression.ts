import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstPrivateIdentifier } from "./PrivateIdentifier";
import { AstBinaryExpressionContainers } from './helpers/BinaryExpressionHelper';

export class AstBinaryExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#binaryexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#binaryexpression

    declare type: "BinaryExpression";

    declare operator: 
        | "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>"
        | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "in"
        | "instanceof" | "**";
    declare left: AstExpression | AstPrivateIdentifier;
    declare right: AstExpression;

    declare container: AstBinaryExpressionContainers;

    declare components: (AstExpression | AstPrivateIdentifier)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstBinaryExpression(node: any): node is AstBinaryExpression {
    return node instanceof AstBinaryExpression;
}
