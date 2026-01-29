import { AstNode } from "./Node";
import { AstMemberExpression } from "./MemberExpression";
import { AstCallExpression } from "./CallExpression";

export class AstSuper extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions

    declare type: "Super";


    declare container: AstMemberExpression | AstCallExpression;

    declare components: never[];


};

export function isAstSuper(node: any): node is AstSuper {
    return node instanceof AstSuper;
}
