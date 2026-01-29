import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstConditionalExpressionContainers } from './helpers/ConditionalExpressionHelper';

export class AstConditionalExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#conditionalexpression

    declare type: "ConditionalExpression";

    declare test: AstExpression;
    declare alternate: AstExpression;
    declare consequent: AstExpression;

    declare container: AstConditionalExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstConditionalExpression(node: any): node is AstConditionalExpression {
    return node instanceof AstConditionalExpression;
}
