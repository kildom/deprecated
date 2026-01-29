import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstWithStatementContainers } from './helpers/WithStatementHelper';

export class AstWithStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#withstatement

    declare type: "WithStatement";

    declare object: AstExpression;
    declare body: AstStatement;

    declare container: AstWithStatementContainers;

    declare components: (AstExpression | AstStatement)[];


};

export function isAstWithStatement(node: any): node is AstWithStatement {
    return node instanceof AstWithStatement;
}
