import { AstPattern } from "./common";
import { AstIdentifier } from "./Identifier";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export class AstRestElement extends AstNode {
    type!: 'RestElement';
    argument!: AstPattern;


    getPatternLeafs(): (AstMemberExpression | AstIdentifier)[] {
        return this.argument.getPatternLeafs();
    }
}
