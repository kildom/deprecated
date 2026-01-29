import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpressionSymbol } from "./Expression";
import { AstThisExpressionContainers } from './helpers/ThisExpressionHelper';

export class AstThisExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#thisexpression

    declare type: "ThisExpression";


    declare container: AstThisExpressionContainers;

    declare components: never[];



    [AstExpressionSymbol]: true = true;
};

export function isAstThisExpression(node: any): node is AstThisExpression {
    return node instanceof AstThisExpression;
}
