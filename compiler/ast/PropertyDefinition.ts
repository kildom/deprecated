import { AstNode } from "./Node";
import { AstExpression } from "./Expression";
import { AstPrivateIdentifier } from "./PrivateIdentifier";
import { AstClassBody } from "./ClassBody";

export class AstPropertyDefinition extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#propertydefinition

    declare type: "PropertyDefinition";

    declare key: AstExpression | AstPrivateIdentifier;
    declare value: AstExpression | null;
    declare computed: boolean;
    declare static: boolean;

    declare container: AstClassBody;

    declare components: (AstExpression | AstPrivateIdentifier)[];


};

export function isAstPropertyDefinition(node: any): node is AstPropertyDefinition {
    return node instanceof AstPropertyDefinition;
}
