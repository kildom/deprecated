import { AstNode } from "./Node";
import { AstIdentifier } from "./Identifier";
import { AstExpression } from "./Expression";
import { AstClassBody } from "./ClassBody";
import { AstClassContainers } from './helpers/ClassHelper';

export class AstClass extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#classes

    declare type: "ClassDeclaration" | "ClassExpression";

    declare id: AstIdentifier | null;
    declare superClass: AstExpression | null;
    declare body: AstClassBody;

    declare container: AstClassContainers;

    declare components: (AstIdentifier | AstExpression | AstClassBody)[];


};

export function isAstClass(node: any): node is AstClass {
    return node instanceof AstClass;
}
