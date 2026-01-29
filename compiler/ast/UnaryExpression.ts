import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstUnaryExpressionContainers } from './helpers/UnaryExpressionHelper';

export class AstUnaryExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#unaryexpression

    declare type: "UnaryExpression";

    declare operator: "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";
    declare prefix: boolean;
    declare argument: AstExpression;

    declare container: AstUnaryExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstUnaryExpression(node: any): node is AstUnaryExpression {
    return node instanceof AstUnaryExpression;
}
