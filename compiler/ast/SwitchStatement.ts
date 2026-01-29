import { AstStatement } from "./Statement";
import { AstExpression } from "./Expression";
import { AstSwitchCase } from "./SwitchCase";
import { AstSwitchStatementContainers } from './helpers/SwitchStatementHelper';

export class AstSwitchStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#switchstatement

    declare type: "SwitchStatement";

    declare discriminant: AstExpression;
    declare cases: AstSwitchCase[];

    declare container: AstSwitchStatementContainers;

    declare components: (AstExpression | AstSwitchCase)[];


};

export function isAstSwitchStatement(node: any): node is AstSwitchStatement {
    return node instanceof AstSwitchStatement;
}
