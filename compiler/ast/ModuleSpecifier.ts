import { AstNode } from "./Node";
import { AstIdentifier } from "./Identifier";
import { AstImportDeclaration } from "./ImportDeclaration";
import { AstExportNamedDeclaration } from "./ExportNamedDeclaration";
import { AstLiteral } from "./Literal";

export class AstModuleSpecifier extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#modulespecifier

    declare type:
        | "ImportSpecifier"
        | "ImportDefaultSpecifier"
        | "ImportNamespaceSpecifier"
        | "ExportSpecifier";

    declare local: AstIdentifier;

    declare container: AstImportDeclaration | AstExportNamedDeclaration;

    declare components: (AstIdentifier | AstLiteral)[];


};

export function isAstModuleSpecifier(node: any): node is AstModuleSpecifier {
    return node instanceof AstModuleSpecifier;
}
