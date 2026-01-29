import { AstClass } from "./Class";
import { AstDeclarationIntf, AstDeclarationSymbol } from "./Declaration";
import { AstIdentifier } from "./Identifier";
import { AstExpression } from "./Expression";
import { AstClassBody } from "./ClassBody";
import { AstClassDeclarationContainers } from './helpers/ClassDeclarationHelper';

export class AstClassDeclaration extends AstClass implements AstDeclarationIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#classdeclaration

    declare type: "ClassDeclaration";

    declare id: AstIdentifier;
    declare superClass: AstExpression | null;
    declare body: AstClassBody;

    declare container: AstClassDeclarationContainers;

    declare components: (AstIdentifier | AstExpression | AstClassBody)[];



    [AstDeclarationSymbol]: true = true;
};

export function isAstClassDeclaration(node: any): node is AstClassDeclaration {
    return node instanceof AstClassDeclaration;
}
