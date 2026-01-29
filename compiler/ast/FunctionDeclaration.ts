import { AstFunction } from "./Function";
import { AstDeclarationIntf, AstDeclarationSymbol } from "./Declaration";
import { AstIdentifier } from "./Identifier";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstFunctionDeclarationContainers } from './helpers/FunctionDeclarationHelper';

export class AstFunctionDeclaration extends AstFunction implements AstDeclarationIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#functiondeclaration

    declare type: "FunctionDeclaration";

    declare id: AstIdentifier;
    declare params: AstPattern[];
    declare body: AstBlockStatement;
    declare generator: boolean;
    declare async: boolean;

    declare container: AstFunctionDeclarationContainers;

    declare components: (AstIdentifier | AstPattern | AstBlockStatement)[];



    [AstDeclarationSymbol]: true = true;
};

export function isAstFunctionDeclaration(node: any): node is AstFunctionDeclaration {
    return node instanceof AstFunctionDeclaration;
}
