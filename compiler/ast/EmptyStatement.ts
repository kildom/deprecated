import { AstStatement } from "./Statement";
import { AstEmptyStatementContainers } from './helpers/EmptyStatementHelper';

export class AstEmptyStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#emptystatement

    declare type: "EmptyStatement";


    declare container: AstEmptyStatementContainers;

    declare components: never[];


};

export function isAstEmptyStatement(node: any): node is AstEmptyStatement {
    return node instanceof AstEmptyStatement;
}
