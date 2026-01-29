import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstYieldExpressionContainers } from './helpers/YieldExpressionHelper';

export class AstYieldExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#yieldexpression

    declare type: "YieldExpression";

    declare argument: AstExpression | null;
    declare delegate: boolean;

    declare container: AstYieldExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstYieldExpression(node: any): node is AstYieldExpression {
    return node instanceof AstYieldExpression;
}
