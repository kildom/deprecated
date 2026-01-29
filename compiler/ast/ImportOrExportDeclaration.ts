import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstImportOrExportDeclarationComponents } from './helpers/ImportOrExportDeclarationHelper';

export class AstImportOrExportDeclaration extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#importorexportdeclaration

    declare type:
        | "ImportDeclaration"
        | "ExportNamedDeclaration"
        | "ExportDefaultDeclaration"
        | "ExportAllDeclaration";


    declare container: AstProgram;

    declare components: AstImportOrExportDeclarationComponents[];


};

export function isAstImportOrExportDeclaration(node: any): node is AstImportOrExportDeclaration {
    return node instanceof AstImportOrExportDeclaration;
}
