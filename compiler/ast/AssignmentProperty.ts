import { AstProperty } from "./Property";
import { AstExpression } from "./Expression";
import { AstPattern } from "./Pattern";
import { AstObjectExpression } from "./ObjectExpression";
import { AstObjectPattern } from "./ObjectPattern";

export class AstAssignmentProperty extends AstProperty {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#objectpattern

    declare type: "Property";

    declare key: AstExpression;
    declare value: AstPattern;
    declare kind: "init";
    declare method: false;
    declare shorthand: boolean;
    declare computed: boolean;

    declare container: AstObjectExpression | AstObjectPattern;

    declare components: (AstExpression | AstPattern)[];


};

export function isAstAssignmentProperty(node: any): node is AstAssignmentProperty {
    return node instanceof AstAssignmentProperty;
}
