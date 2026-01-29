import { AstForInStatement } from "./ForInStatement";
import { AstVariableDeclaration } from "./VariableDeclaration";
import { AstPattern } from "./Pattern";
import { AstExpression } from "./Expression";
import { AstStatement } from "./Statement";
import { AstForOfStatementContainers, AstForOfStatementComponents } from './helpers/ForOfStatementHelper';

export class AstForOfStatement extends AstForInStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#forofstatement
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2018.md#statements

    declare type: "ForOfStatement";

    declare left: AstVariableDeclaration | AstPattern;
    declare right: AstExpression;
    declare body: AstStatement;
    declare await: boolean;

    declare container: AstForOfStatementContainers;

    declare components: AstForOfStatementComponents[];


};

export function isAstForOfStatement(node: any): node is AstForOfStatement {
    return node instanceof AstForOfStatement;
}
