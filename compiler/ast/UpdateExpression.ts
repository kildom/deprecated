import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstUpdateExpressionContainers } from './helpers/UpdateExpressionHelper';

export class AstUpdateExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#updateexpression

    declare type: "UpdateExpression";

    declare operator: "++" | "--";
    declare argument: AstExpression;
    declare prefix: boolean;

    declare container: AstUpdateExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstUpdateExpression(node: any): node is AstUpdateExpression {
    return node instanceof AstUpdateExpression;
}
