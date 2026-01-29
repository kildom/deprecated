import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstChainElementIntf, AstChainElementSymbol } from "./ChainElement";
import { AstSuper } from "./Super";
import { AstSpreadElement } from "./SpreadElement";
import { AstCallExpressionContainers } from './helpers/CallExpressionHelper';

export class AstCallExpression extends AstNode implements AstExpressionIntf, AstChainElementIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#callexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2020.md#chainexpression

    declare type: "CallExpression";

    declare optional: boolean;
    declare callee: AstExpression | AstSuper;
    declare arguments: (AstExpression | AstSpreadElement)[];

    declare container: AstCallExpressionContainers;

    declare components: (AstExpression | AstSuper | AstSpreadElement)[];



    [AstExpressionSymbol]: true = true;
    [AstChainElementSymbol]: true = true;
};

export function isAstCallExpression(node: any): node is AstCallExpression {
    return node instanceof AstCallExpression;
}
