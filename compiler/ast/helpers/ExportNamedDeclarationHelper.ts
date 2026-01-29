import { AstDeclaration } from "../Declaration";
import { AstExportSpecifier } from "../ExportSpecifier";
import { AstLiteral } from "../Literal";
import { AstImportAttribute } from "../ImportAttribute";

export type AstExportNamedDeclarationComponents = AstDeclaration | AstExportSpecifier | AstLiteral | AstImportAttribute;
