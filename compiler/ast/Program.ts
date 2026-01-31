import { AstFunction } from "./Function";
import { AstImportOrExportDeclaration } from "./ImportOrExportDeclaration";
import { Scope, ScopeSymbol } from "../scope";
import { AstBlockStatement } from "./BlockStatement";
import { empty } from "../utils";
import { AstNode } from "./Node";
import { DumpOutput } from "../dump";

export class AstProgram extends AstFunction implements Scope {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#programs
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#programs

    declare type: "Program";

    declare importExport: AstImportOrExportDeclaration[];
    declare body: AstBlockStatement;
    declare sourceType: "script" | "module";

    declare container: null;

    declare components: (AstBlockStatement | AstImportOrExportDeclaration)[];

    variables = empty<Scope['variables']>();
    scopeOptions: Scope['scopeOptions'] = {
        parent: null,
        isWith: false,
        letDeclarations: true,
        varDeclarations: true,
    };
    [ScopeSymbol]: true = true;

    error(node: AstNode | null, message: string) {
        this.app.error(node ?? this, message);
    }

};

export function isAstProgram(node: any): node is AstProgram {
    return node instanceof AstProgram;
}
