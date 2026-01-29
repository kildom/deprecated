import { AstStatement } from "./Statement";
import { AstIdentifier } from "./Identifier";
import { AstContinueStatementContainers } from './helpers/ContinueStatementHelper';

export class AstContinueStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#continuestatement

    declare type: "ContinueStatement";

    declare label: AstIdentifier | null;

    declare container: AstContinueStatementContainers;

    declare components: (AstIdentifier)[];


};

export function isAstContinueStatement(node: any): node is AstContinueStatement {
    return node instanceof AstContinueStatement;
}
