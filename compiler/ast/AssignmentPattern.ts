import { AstPattern } from "./Pattern";
import { AstExpression } from "./Expression";
import { AstAssignmentPatternContainers } from './helpers/AssignmentPatternHelper';

export class AstAssignmentPattern extends AstPattern {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#assignmentpattern

    declare type: "AssignmentPattern";

    declare left: AstPattern;
    declare right: AstExpression;

    declare container: AstAssignmentPatternContainers;

    declare components: (AstPattern | AstExpression)[];


};

export function isAstAssignmentPattern(node: any): node is AstAssignmentPattern {
    return node instanceof AstAssignmentPattern;
}
