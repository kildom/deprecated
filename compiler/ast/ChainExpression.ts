import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpressionSymbol } from "./Expression";
import { AstChainElement } from "./ChainElement";
import { AstChainExpressionContainers } from './helpers/ChainExpressionHelper';

export class AstChainExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2020.md#chainexpression

    declare type: "ChainExpression";

    declare expression: AstChainElement;

    declare container: AstChainExpressionContainers;

    declare components: (AstChainElement)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstChainExpression(node: any): node is AstChainExpression {
    return node instanceof AstChainExpression;
}
