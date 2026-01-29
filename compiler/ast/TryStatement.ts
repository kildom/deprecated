import { AstStatement } from "./Statement";
import { AstBlockStatement } from "./BlockStatement";
import { AstCatchClause } from "./CatchClause";
import { AstTryStatementContainers } from './helpers/TryStatementHelper';

export class AstTryStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#trystatement

    declare type: "TryStatement";

    declare block: AstBlockStatement;
    declare handler: AstCatchClause | null;
    declare finalizer: AstBlockStatement | null;

    declare container: AstTryStatementContainers;

    declare components: (AstBlockStatement | AstCatchClause)[];


};

export function isAstTryStatement(node: any): node is AstTryStatement {
    return node instanceof AstTryStatement;
}
