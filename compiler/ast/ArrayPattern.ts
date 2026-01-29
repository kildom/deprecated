import { AstPattern } from "./Pattern";
import { AstArrayPatternContainers } from './helpers/ArrayPatternHelper';

export class AstArrayPattern extends AstPattern {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#arraypattern

    declare type: "ArrayPattern";

    declare elements: (AstPattern | null)[];

    declare container: AstArrayPatternContainers;

    declare components: (AstPattern)[];


};

export function isAstArrayPattern(node: any): node is AstArrayPattern {
    return node instanceof AstArrayPattern;
}
