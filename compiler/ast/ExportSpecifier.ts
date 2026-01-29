import { AstModuleSpecifier } from "./ModuleSpecifier";
import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstExportNamedDeclaration } from "./ExportNamedDeclaration";

export class AstExportSpecifier extends AstModuleSpecifier {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#exportspecifier
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#exportspecifier

    declare type: "ExportSpecifier";

    declare local: AstIdentifier | AstLiteral;
    declare exported: AstIdentifier | AstLiteral;

    declare container: AstExportNamedDeclaration;

    declare components: (AstIdentifier | AstLiteral)[];


};

export function isAstExportSpecifier(node: any): node is AstExportSpecifier {
    return node instanceof AstExportSpecifier;
}
