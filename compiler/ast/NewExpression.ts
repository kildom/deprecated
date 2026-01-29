import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstSpreadElement } from "./SpreadElement";
import { AstNewExpressionContainers } from './helpers/NewExpressionHelper';

export class AstNewExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#newexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions

    declare type: "NewExpression";

    declare callee: AstExpression;
    declare arguments: (AstExpression | AstSpreadElement)[];

    declare container: AstNewExpressionContainers;

    declare components: (AstExpression | AstSpreadElement)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstNewExpression(node: any): node is AstNewExpression {
    return node instanceof AstNewExpression;
}
