import { AstNode } from "./Node";
import { AstPatternContainers, AstPatternComponents } from './helpers/PatternHelper';

export class AstPattern extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#patterns

    declare type:
        | "Identifier"
        | "MemberExpression"
        | "ObjectPattern"
        | "ArrayPattern"
        | "RestElement"
        | "AssignmentPattern";


    declare container: AstPatternContainers;

    declare components: AstPatternComponents[];


};

export function isAstPattern(node: any): node is AstPattern {
    return node instanceof AstPattern;
}
