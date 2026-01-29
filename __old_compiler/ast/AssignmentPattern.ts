import { AstPattern } from "./common";
import { AstExpression } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";


export class AstAssignmentPattern extends AstNode {
    type!: 'AssignmentPattern';
    left!: AstPattern;
    right!: AstExpression;

    protected initialize(): void {
        throw new Error("What is this?");
    }

    getPatternLeafs(): (AstMemberExpression | AstIdentifier)[] {
        return this.left.getPatternLeafs();
    }
}
