import { AstImportOrExportDeclaration } from "./ImportOrExportDeclaration";
import { AstDeclaration } from "./Declaration";
import { AstExportSpecifier } from "./ExportSpecifier";
import { AstLiteral } from "./Literal";
import { AstImportAttribute } from "./ImportAttribute";
import { AstProgram } from "./Program";
import { AstExportNamedDeclarationComponents } from './helpers/ExportNamedDeclarationHelper';

export class AstExportNamedDeclaration extends AstImportOrExportDeclaration {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#exportnameddeclaration
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2025.md#exportnameddeclaration

    declare type: "ExportNamedDeclaration";

    declare declaration: AstDeclaration | null;
    declare specifiers: AstExportSpecifier[];
    declare source: AstLiteral | null;
    declare attributes: AstImportAttribute[] | null;

    declare container: AstProgram;

    declare components: AstExportNamedDeclarationComponents[];


};

export function isAstExportNamedDeclaration(node: any): node is AstExportNamedDeclaration {
    return node instanceof AstExportNamedDeclaration;
}
