import { AstStatement } from "./Statement";
import { AstIdentifier } from "./Identifier";
import { AstBreakStatementContainers } from './helpers/BreakStatementHelper';

export class AstBreakStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#breakstatement

    declare type: "BreakStatement";

    declare label: AstIdentifier | null;

    declare container: AstBreakStatementContainers;

    declare components: (AstIdentifier)[];


};

export function isAstBreakStatement(node: any): node is AstBreakStatement {
    return node instanceof AstBreakStatement;
}
