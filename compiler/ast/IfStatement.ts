import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstIfStatementContainers } from './helpers/IfStatementHelper';

export class AstIfStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#ifstatement

    declare type: "IfStatement";

    declare test: AstExpression;
    declare consequent: AstStatement;
    declare alternate: AstStatement | null;

    declare container: AstIfStatementContainers;

    declare components: (AstExpression | AstStatement)[];


};

export function isAstIfStatement(node: any): node is AstIfStatement {
    return node instanceof AstIfStatement;
}
