import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstImportExpressionContainers } from './helpers/ImportExpressionHelper';

export class AstImportExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2020.md#importexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2025.md#importexpression

    declare type: "ImportExpression";

    declare source: AstExpression;
    declare options: AstExpression | null;

    declare container: AstImportExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstImportExpression(node: any): node is AstImportExpression {
    return node instanceof AstImportExpression;
}
