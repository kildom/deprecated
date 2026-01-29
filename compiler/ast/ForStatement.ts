import { AstStatement } from "./Statement";
import { AstVariableDeclaration } from "./VariableDeclaration";
import { AstExpression } from "./Expression";
import { AstForStatementContainers } from './helpers/ForStatementHelper';

export class AstForStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#forstatement

    declare type: "ForStatement";

    declare init: AstVariableDeclaration | AstExpression | null;
    declare test: AstExpression | null;
    declare update: AstExpression | null;
    declare body: AstStatement;

    declare container: AstForStatementContainers;

    declare components: (AstVariableDeclaration | AstExpression | AstStatement)[];


};

export function isAstForStatement(node: any): node is AstForStatement {
    return node instanceof AstForStatement;
}
