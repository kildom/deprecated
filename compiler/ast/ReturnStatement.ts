import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstReturnStatementContainers } from './helpers/ReturnStatementHelper';

export class AstReturnStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#returnstatement

    declare type: "ReturnStatement";

    declare argument: AstExpression | null;

    declare container: AstReturnStatementContainers;

    declare components: (AstExpression)[];


};

export function isAstReturnStatement(node: any): node is AstReturnStatement {
    return node instanceof AstReturnStatement;
}
