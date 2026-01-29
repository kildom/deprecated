import { AstNode } from "./Node";
import { AstExpression } from "./Expression";
import { AstObjectExpression } from "./ObjectExpression";
import { AstObjectPattern } from "./ObjectPattern";
import { AstPattern } from "./Pattern";

export class AstProperty extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#property
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions

    declare type: "Property";

    declare key: AstExpression;
    declare value: AstExpression;
    declare kind: "init" | "get" | "set";
    declare method: boolean;
    declare shorthand: boolean;
    declare computed: boolean;

    declare container: AstObjectExpression | AstObjectPattern;

    declare components: (AstExpression | AstPattern)[];


};

export function isAstProperty(node: any): node is AstProperty {
    return node instanceof AstProperty;
}
