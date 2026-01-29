import { AstClass } from "./Class";
import { AstExpression } from "./Expression";
import { AstClassBody } from "./ClassBody";
import { AstExportDefaultDeclaration } from "./ExportDefaultDeclaration";

export class AstAnonymousDefaultExportedClassDeclaration extends AstClass {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#exportdefaultdeclaration

    declare type: "ClassDeclaration";

    declare id: null;
    declare superClass: AstExpression | null;
    declare body: AstClassBody;

    declare container: AstExportDefaultDeclaration;

    declare components: (AstExpression | AstClassBody)[];


};

export function isAstAnonymousDefaultExportedClassDeclaration(node: any): node is AstAnonymousDefaultExportedClassDeclaration {
    return node instanceof AstAnonymousDefaultExportedClassDeclaration;
}
