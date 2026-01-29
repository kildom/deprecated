import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstSpreadElement } from "./SpreadElement";
import { AstArrayExpressionContainers } from './helpers/ArrayExpressionHelper';

export class AstArrayExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#arrayexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions

    declare type: "ArrayExpression";

    declare elements: (AstExpression | AstSpreadElement | null)[];

    declare container: AstArrayExpressionContainers;

    declare components: (AstExpression | AstSpreadElement)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstArrayExpression(node: any): node is AstArrayExpression {
    return node instanceof AstArrayExpression;
}
