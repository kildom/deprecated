import { AstPattern } from "./common";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";


export class AstAssignmentPattern extends AstNode {
    type!: 'AssignmentPattern';
    left!: AstPattern;
    right!: AstExpression;
}
