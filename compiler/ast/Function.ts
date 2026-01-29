import { AstNode } from "./Node";
import { AstIdentifier } from "./Identifier";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstFunctionContainers, AstFunctionComponents } from './helpers/FunctionHelper';

export class AstFunction extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#functions
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#functions
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2017.md#function

    declare type: "FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression";

    declare id: AstIdentifier | null;
    declare params: AstPattern[];
    declare body: AstBlockStatement;
    declare generator: boolean;
    declare async: boolean;

    declare container: AstFunctionContainers;

    declare components: AstFunctionComponents[];


};

export function isAstFunction(node: any): node is AstFunction {
    return node instanceof AstFunction;
}
