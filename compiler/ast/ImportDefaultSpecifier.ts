import { AstModuleSpecifier } from "./ModuleSpecifier";
import { AstIdentifier } from "./Identifier";
import { AstImportDeclaration } from "./ImportDeclaration";

export class AstImportDefaultSpecifier extends AstModuleSpecifier {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#importdefaultspecifier

    declare type: "ImportDefaultSpecifier";

    declare local: AstIdentifier;

    declare container: AstImportDeclaration;

    declare components: (AstIdentifier)[];


};

export function isAstImportDefaultSpecifier(node: any): node is AstImportDefaultSpecifier {
    return node instanceof AstImportDefaultSpecifier;
}
