import { AstImportSpecifier } from "../ImportSpecifier";
import { AstImportDefaultSpecifier } from "../ImportDefaultSpecifier";
import { AstImportNamespaceSpecifier } from "../ImportNamespaceSpecifier";
import { AstLiteral } from "../Literal";
import { AstImportAttribute } from "../ImportAttribute";
import { AstDeclaration } from "../Declaration";
import { AstExportSpecifier } from "../ExportSpecifier";
import { AstAnonymousDefaultExportedFunctionDeclaration } from "../AnonymousDefaultExportedFunctionDeclaration";
import { AstFunctionDeclaration } from "../FunctionDeclaration";
import { AstAnonymousDefaultExportedClassDeclaration } from "../AnonymousDefaultExportedClassDeclaration";
import { AstClassDeclaration } from "../ClassDeclaration";
import { AstExpression } from "../Expression";
import { AstIdentifier } from "../Identifier";

export type AstImportOrExportDeclarationComponents = AstImportSpecifier | AstImportDefaultSpecifier | AstImportNamespaceSpecifier | AstLiteral | AstImportAttribute | AstDeclaration | AstExportSpecifier | AstAnonymousDefaultExportedFunctionDeclaration | AstFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstClassDeclaration | AstExpression | AstIdentifier;
