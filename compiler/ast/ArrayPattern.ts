import { AstPattern } from "./common";
import { AstNode } from "./Node";

export class AstArrayPattern extends AstNode {
    type!: 'ArrayPattern';
    elements!: (AstPattern | null)[];
}
