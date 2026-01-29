import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstLiteral } from "./Literal";
import { AstExpressionStatementContainers } from './helpers/ExpressionStatementHelper';

export class AstExpressionStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#expressionstatement

    declare type: "ExpressionStatement";

    declare expression: AstExpression;

    declare container: AstExpressionStatementContainers;

    declare components: (AstExpression | AstLiteral)[];


};

export function isAstExpressionStatement(node: any): node is AstExpressionStatement {
    return node instanceof AstExpressionStatement;
}
