import { AstModuleSpecifier } from "./ModuleSpecifier";
import { AstIdentifier } from "./Identifier";
import { AstImportDeclaration } from "./ImportDeclaration";

export class AstImportNamespaceSpecifier extends AstModuleSpecifier {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#importnamespacespecifier

    declare type: "ImportNamespaceSpecifier";

    declare local: AstIdentifier;

    declare container: AstImportDeclaration;

    declare components: (AstIdentifier)[];


};

export function isAstImportNamespaceSpecifier(node: any): node is AstImportNamespaceSpecifier {
    return node instanceof AstImportNamespaceSpecifier;
}
