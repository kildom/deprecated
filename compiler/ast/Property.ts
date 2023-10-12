import { AstPattern } from "./common";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";

export class AstProperty extends AstNode {
    type!: 'Property';
    key!: AstExpression;
    value!: AstExpression | AstPattern;
    kind!: 'init' | 'get' | 'set';
    method!: boolean;
    shorthand!: boolean;
    computed!: boolean;

}
