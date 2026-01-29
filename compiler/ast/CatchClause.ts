import { AstNode } from "./Node";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstTryStatement } from "./TryStatement";

export class AstCatchClause extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#catchclause
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2019.md#catchclause

    declare type: "CatchClause";

    declare param: AstPattern | null;
    declare body: AstBlockStatement;

    declare container: AstTryStatement;

    declare components: (AstPattern | AstBlockStatement)[];


};

export function isAstCatchClause(node: any): node is AstCatchClause {
    return node instanceof AstCatchClause;
}
