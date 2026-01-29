import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstWhileStatementContainers } from './helpers/WhileStatementHelper';

export class AstWhileStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#whilestatement

    declare type: "WhileStatement";

    declare test: AstExpression;
    declare body: AstStatement;

    declare container: AstWhileStatementContainers;

    declare components: (AstExpression | AstStatement)[];


};

export function isAstWhileStatement(node: any): node is AstWhileStatement {
    return node instanceof AstWhileStatement;
}
