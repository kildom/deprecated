import { AstImportOrExportDeclaration, AstPattern } from "../estree";
import { AstBlockStatement } from "./BlockStatement";
import { AstExpression } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstStatement } from "./Statement";


export class AstFunctionBase extends AstNode {
    id!: AstIdentifier | null;
    params!: AstPattern[];
    body!: AstBlockStatement | AstExpression | (AstStatement | AstImportOrExportDeclaration)[];
    generator!: boolean;    // since ES2015
    async!: boolean;    // since ES2017
}
