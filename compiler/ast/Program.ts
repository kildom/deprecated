import { AstNode } from "./Node";
import { AstStatement } from "./Statement";
import { AstImportOrExportDeclaration } from "./ImportOrExportDeclaration";

export class AstProgram extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#programs
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#programs

    declare type: "Program";

    declare body: (AstStatement | AstImportOrExportDeclaration)[];
    declare sourceType: "script" | "module";

    declare container: null;

    declare components: (AstStatement | AstImportOrExportDeclaration)[];


};

export function isAstProgram(node: any): node is AstProgram {
    return node instanceof AstProgram;
}
