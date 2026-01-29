import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstLogicalExpressionContainers } from './helpers/LogicalExpressionHelper';

export class AstLogicalExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#logicalexpression

    declare type: "LogicalExpression";

    declare operator: "||" | "&&" | "??";
    declare left: AstExpression;
    declare right: AstExpression;

    declare container: AstLogicalExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstLogicalExpression(node: any): node is AstLogicalExpression {
    return node instanceof AstLogicalExpression;
}
