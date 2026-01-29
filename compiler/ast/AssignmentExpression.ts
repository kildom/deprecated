import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstPattern } from "./Pattern";
import { AstAssignmentExpressionContainers } from './helpers/AssignmentExpressionHelper';

export class AstAssignmentExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#assignmentexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions

    declare type: "AssignmentExpression";

    declare operator: 
        | "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>="
        | "|=" | "^=" | "&=" | "**=" | "||=" | "&&=" | "??=";
    declare left: AstPattern;
    declare right: AstExpression;

    declare container: AstAssignmentExpressionContainers;

    declare components: (AstPattern | AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstAssignmentExpression(node: any): node is AstAssignmentExpression {
    return node instanceof AstAssignmentExpression;
}
