import { AstNode } from "./Node";
import { AstExpression } from "./Expression";
import { AstStatement } from "./Statement";
import { AstSwitchStatement } from "./SwitchStatement";

export class AstSwitchCase extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#switchcase

    declare type: "SwitchCase";

    declare test: AstExpression | null;
    declare consequent: AstStatement[];

    declare container: AstSwitchStatement;

    declare components: (AstExpression | AstStatement)[];


};

export function isAstSwitchCase(node: any): node is AstSwitchCase {
    return node instanceof AstSwitchCase;
}
