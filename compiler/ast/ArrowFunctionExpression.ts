import { AstFunction } from "./Function";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstArrowFunctionExpressionContainers, AstArrowFunctionExpressionComponents } from './helpers/ArrowFunctionExpressionHelper';

export class AstArrowFunctionExpression extends AstFunction implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#arrowfunctionexpression

    declare type: "ArrowFunctionExpression";

    declare id: AstIdentifier | null;
    declare params: AstPattern[];
    declare body: AstBlockStatement | AstExpression;
    declare generator: false;
    declare async: boolean;
    declare expression: boolean;

    declare container: AstArrowFunctionExpressionContainers;

    declare components: AstArrowFunctionExpressionComponents[];



    [AstExpressionSymbol]: true = true;
};

export function isAstArrowFunctionExpression(node: any): node is AstArrowFunctionExpression {
    return node instanceof AstArrowFunctionExpression;
}
