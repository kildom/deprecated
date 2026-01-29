import { AstAnonymousDefaultExportedFunctionDeclaration } from "../AnonymousDefaultExportedFunctionDeclaration";
import { AstFunctionDeclaration } from "../FunctionDeclaration";
import { AstAnonymousDefaultExportedClassDeclaration } from "../AnonymousDefaultExportedClassDeclaration";
import { AstClassDeclaration } from "../ClassDeclaration";
import { AstExpression } from "../Expression";

export type AstExportDefaultDeclarationComponents = AstAnonymousDefaultExportedFunctionDeclaration | AstFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstClassDeclaration | AstExpression;
