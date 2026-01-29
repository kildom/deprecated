import { AstFunction } from "./Function";
import { AstExpressionIntf, AstExpressionSymbol } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstFunctionExpressionContainers } from './helpers/FunctionExpressionHelper';

export class AstFunctionExpression extends AstFunction implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#functionexpression

    declare type: "FunctionExpression";

    declare id: AstIdentifier | null;
    declare params: AstPattern[];
    declare body: AstBlockStatement;
    declare generator: boolean;
    declare async: boolean;

    declare container: AstFunctionExpressionContainers;

    declare components: (AstIdentifier | AstPattern | AstBlockStatement)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstFunctionExpression(node: any): node is AstFunctionExpression {
    return node instanceof AstFunctionExpression;
}
