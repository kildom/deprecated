import { AstImportSpecifier } from "../ImportSpecifier";
import { AstImportDefaultSpecifier } from "../ImportDefaultSpecifier";
import { AstImportNamespaceSpecifier } from "../ImportNamespaceSpecifier";
import { AstLiteral } from "../Literal";
import { AstImportAttribute } from "../ImportAttribute";

export type AstImportDeclarationComponents = AstImportSpecifier | AstImportDefaultSpecifier | AstImportNamespaceSpecifier | AstLiteral | AstImportAttribute;
