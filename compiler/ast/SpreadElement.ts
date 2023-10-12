import { AstCallExpression } from "./CallExpression";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";

export class AstSpreadElement extends AstNode {
    type!: 'SpreadElement';
    argument!: AstExpression;
    parent!: AstCallExpression;

}
