import { AstPattern } from "../estree";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";

export class AstProperty extends AstNode {
    type: 'Property';
    key: AstExpression;    // since ES2015
    //   AstLiteral | AstIdentifier;
    value: AstExpression | AstPattern;
    kind: 'init' | 'get' | 'set';
    method: boolean;    // since ES2015
    shorthand: boolean;    // since ES2015
    computed: boolean;    // since ES2015
}
