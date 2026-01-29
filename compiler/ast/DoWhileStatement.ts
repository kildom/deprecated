import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstDoWhileStatementContainers } from './helpers/DoWhileStatementHelper';

export class AstDoWhileStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#dowhilestatement

    declare type: "DoWhileStatement";

    declare body: AstStatement;
    declare test: AstExpression;

    declare container: AstDoWhileStatementContainers;

    declare components: (AstStatement | AstExpression)[];


};

export function isAstDoWhileStatement(node: any): node is AstDoWhileStatement {
    return node instanceof AstDoWhileStatement;
}
