import { AstNode } from "./Node";
import { AstPattern } from "./Pattern";
import { AstExpression } from "./Expression";
import { AstVariableDeclaration } from "./VariableDeclaration";

export class AstVariableDeclarator extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#variabledeclarator

    declare type: "VariableDeclarator";

    declare id: AstPattern;
    declare init: AstExpression | null;

    declare container: AstVariableDeclaration;

    declare components: (AstPattern | AstExpression)[];


};

export function isAstVariableDeclarator(node: any): node is AstVariableDeclarator {
    return node instanceof AstVariableDeclarator;
}
