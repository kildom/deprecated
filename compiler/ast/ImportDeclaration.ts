import { AstImportOrExportDeclaration } from "./ImportOrExportDeclaration";
import { AstImportSpecifier } from "./ImportSpecifier";
import { AstImportDefaultSpecifier } from "./ImportDefaultSpecifier";
import { AstImportNamespaceSpecifier } from "./ImportNamespaceSpecifier";
import { AstLiteral } from "./Literal";
import { AstImportAttribute } from "./ImportAttribute";
import { AstProgram } from "./Program";
import { AstImportDeclarationComponents } from './helpers/ImportDeclarationHelper';

export class AstImportDeclaration extends AstImportOrExportDeclaration {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#importdeclaration
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2025.md#importdeclaration

    declare type: "ImportDeclaration";

    declare specifiers: (AstImportSpecifier | AstImportDefaultSpecifier | AstImportNamespaceSpecifier)[];
    declare source: AstLiteral;
    declare attributes: AstImportAttribute[] | null;

    declare container: AstProgram;

    declare components: AstImportDeclarationComponents[];


};

export function isAstImportDeclaration(node: any): node is AstImportDeclaration {
    return node instanceof AstImportDeclaration;
}
