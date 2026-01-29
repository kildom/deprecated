import { AstNode } from "./Node";
import { AstExpression } from "./Expression";
import { AstPrivateIdentifier } from "./PrivateIdentifier";
import { AstFunctionExpression } from "./FunctionExpression";
import { AstClassBody } from "./ClassBody";

export class AstMethodDefinition extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#methoddefinition
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#methoddefinition

    declare type: "MethodDefinition";

    declare key: AstExpression | AstPrivateIdentifier;
    declare value: AstFunctionExpression;
    declare kind: "constructor" | "method" | "get" | "set";
    declare computed: boolean;
    declare static: boolean;

    declare container: AstClassBody;

    declare components: (AstExpression | AstPrivateIdentifier | AstFunctionExpression)[];


};

export function isAstMethodDefinition(node: any): node is AstMethodDefinition {
    return node instanceof AstMethodDefinition;
}
