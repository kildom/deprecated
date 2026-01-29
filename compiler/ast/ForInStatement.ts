import { AstStatement } from "./Statement";
import { AstVariableDeclaration } from "./VariableDeclaration";
import { AstPattern } from "./Pattern";
import { AstExpression } from "./Expression";
import { AstForInStatementContainers, AstForInStatementComponents } from './helpers/ForInStatementHelper';

export class AstForInStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#forinstatement

    declare type: "ForInStatement" | "ForOfStatement";

    declare left: AstVariableDeclaration | AstPattern;
    declare right: AstExpression;
    declare body: AstStatement;

    declare container: AstForInStatementContainers;

    declare components: AstForInStatementComponents[];


};

export function isAstForInStatement(node: any): node is AstForInStatement {
    return node instanceof AstForInStatement;
}
