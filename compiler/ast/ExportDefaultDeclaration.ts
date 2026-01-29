import { AstImportOrExportDeclaration } from "./ImportOrExportDeclaration";
import { AstAnonymousDefaultExportedFunctionDeclaration } from "./AnonymousDefaultExportedFunctionDeclaration";
import { AstFunctionDeclaration } from "./FunctionDeclaration";
import { AstAnonymousDefaultExportedClassDeclaration } from "./AnonymousDefaultExportedClassDeclaration";
import { AstClassDeclaration } from "./ClassDeclaration";
import { AstExpression } from "./Expression";
import { AstProgram } from "./Program";
import { AstExportDefaultDeclarationComponents } from './helpers/ExportDefaultDeclarationHelper';

export class AstExportDefaultDeclaration extends AstImportOrExportDeclaration {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#exportdefaultdeclaration

    declare type: "ExportDefaultDeclaration";

    declare declaration: AstAnonymousDefaultExportedFunctionDeclaration | AstFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstClassDeclaration | AstExpression;

    declare container: AstProgram;

    declare components: AstExportDefaultDeclarationComponents[];


};

export function isAstExportDefaultDeclaration(node: any): node is AstExportDefaultDeclaration {
    return node instanceof AstExportDefaultDeclaration;
}
