import { AstPattern } from "./Pattern";
import { AstRestElementContainers } from './helpers/RestElementHelper';

export class AstRestElement extends AstPattern {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#restelement

    declare type: "RestElement";

    declare argument: AstPattern;

    declare container: AstRestElementContainers;

    declare components: (AstPattern)[];


};

export function isAstRestElement(node: any): node is AstRestElement {
    return node instanceof AstRestElement;
}
