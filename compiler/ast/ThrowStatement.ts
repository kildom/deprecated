import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstThrowStatementContainers } from './helpers/ThrowStatementHelper';

export class AstThrowStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#throwstatement

    declare type: "ThrowStatement";

    declare argument: AstExpression;

    declare container: AstThrowStatementContainers;

    declare components: (AstExpression)[];


};

export function isAstThrowStatement(node: any): node is AstThrowStatement {
    return node instanceof AstThrowStatement;
}
