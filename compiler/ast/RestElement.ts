import { AstPattern } from "./common";
import { AstNode } from "./Node";

export class AstRestElement extends AstNode {
    type!: 'RestElement';
    argument!: AstPattern;
}
