import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpressionSymbol } from "./Expression";
import { AstProperty } from "./Property";
import { AstSpreadElement } from "./SpreadElement";
import { AstObjectExpressionContainers } from './helpers/ObjectExpressionHelper';

export class AstObjectExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#objectexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2018.md#expressions

    declare type: "ObjectExpression";

    declare properties: (AstProperty | AstSpreadElement)[];

    declare container: AstObjectExpressionContainers;

    declare components: (AstProperty | AstSpreadElement)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstObjectExpression(node: any): node is AstObjectExpression {
    return node instanceof AstObjectExpression;
}
