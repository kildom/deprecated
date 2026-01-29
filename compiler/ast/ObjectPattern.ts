import { AstPattern } from "./Pattern";
import { AstAssignmentProperty } from "./AssignmentProperty";
import { AstRestElement } from "./RestElement";
import { AstObjectPatternContainers } from './helpers/ObjectPatternHelper';

export class AstObjectPattern extends AstPattern {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#objectpattern
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2018.md#patterns

    declare type: "ObjectPattern";

    declare properties: (AstAssignmentProperty | AstRestElement)[];

    declare container: AstObjectPatternContainers;

    declare components: (AstAssignmentProperty | AstRestElement)[];


};

export function isAstObjectPattern(node: any): node is AstObjectPattern {
    return node instanceof AstObjectPattern;
}
