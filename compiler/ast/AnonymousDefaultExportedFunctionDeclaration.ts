import { AstFunction } from "./Function";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstExportDefaultDeclaration } from "./ExportDefaultDeclaration";

export class AstAnonymousDefaultExportedFunctionDeclaration extends AstFunction {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#exportdefaultdeclaration

    declare type: "FunctionDeclaration";

    declare id: null;
    declare params: AstPattern[];
    declare body: AstBlockStatement;
    declare generator: boolean;
    declare async: boolean;

    declare container: AstExportDefaultDeclaration;

    declare components: (AstPattern | AstBlockStatement)[];


};

export function isAstAnonymousDefaultExportedFunctionDeclaration(node: any): node is AstAnonymousDefaultExportedFunctionDeclaration {
    return node instanceof AstAnonymousDefaultExportedFunctionDeclaration;
}
