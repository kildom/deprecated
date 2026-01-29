import { AstNode } from "./Node";
import { AstExpression } from "./Expression";
import { AstSpreadElementContainers } from './helpers/SpreadElementHelper';

export class AstSpreadElement extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions

    declare type: "SpreadElement";

    declare argument: AstExpression;

    declare container: AstSpreadElementContainers;

    declare components: (AstExpression)[];


};

export function isAstSpreadElement(node: any): node is AstSpreadElement {
    return node instanceof AstSpreadElement;
}
