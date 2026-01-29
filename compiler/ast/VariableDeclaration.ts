import { AstStatement } from "./Statement";
import { AstDeclarationIntf, AstDeclarationSymbol } from "./Declaration";
import { AstVariableDeclarator } from "./VariableDeclarator";
import { AstVariableDeclarationContainers } from './helpers/VariableDeclarationHelper';

export class AstVariableDeclaration extends AstStatement implements AstDeclarationIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#variabledeclaration
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#variabledeclaration
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2026.md#variabledeclaration

    declare type: "VariableDeclaration";

    declare declarations: AstVariableDeclarator[];
    declare kind: "var" | "let" | "const" | "using" | "await using";

    declare container: AstVariableDeclarationContainers;

    declare components: (AstVariableDeclarator)[];



    [AstDeclarationSymbol]: true = true;
};

export function isAstVariableDeclaration(node: any): node is AstVariableDeclaration {
    return node instanceof AstVariableDeclaration;
}
