import { AstImportOrExportDeclaration } from "./ImportOrExportDeclaration";
import { AstLiteral } from "./Literal";
import { AstIdentifier } from "./Identifier";
import { AstImportAttribute } from "./ImportAttribute";
import { AstProgram } from "./Program";

export class AstExportAllDeclaration extends AstImportOrExportDeclaration {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#exportalldeclaration
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2020.md#exportalldeclaration
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#exportalldeclaration
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2025.md#exportalldeclaration

    declare type: "ExportAllDeclaration";

    declare source: AstLiteral;
    declare exported: AstIdentifier | AstLiteral | null;
    declare attributes: AstImportAttribute[] | null;

    declare container: AstProgram;

    declare components: (AstLiteral | AstIdentifier | AstImportAttribute)[];


};

export function isAstExportAllDeclaration(node: any): node is AstExportAllDeclaration {
    return node instanceof AstExportAllDeclaration;
}
