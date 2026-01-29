import { AstNode } from "./Node";
import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstImportDeclaration } from "./ImportDeclaration";
import { AstExportNamedDeclaration } from "./ExportNamedDeclaration";
import { AstExportAllDeclaration } from "./ExportAllDeclaration";

export class AstImportAttribute extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2025.md#importattribute

    declare type: "ImportAttribute";

    declare key: AstIdentifier | AstLiteral;
    declare value: AstLiteral;

    declare container: AstImportDeclaration | AstExportNamedDeclaration | AstExportAllDeclaration;

    declare components: (AstIdentifier | AstLiteral)[];


};

export function isAstImportAttribute(node: any): node is AstImportAttribute {
    return node instanceof AstImportAttribute;
}
