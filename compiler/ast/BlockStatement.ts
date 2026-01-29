import { AstStatement } from "./Statement";
import { AstBlockStatementContainers } from './helpers/BlockStatementHelper';

export class AstBlockStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#blockstatement

    declare type: "BlockStatement" | "StaticBlock";

    declare body: AstStatement[];

    declare container: AstBlockStatementContainers;

    declare components: (AstStatement)[];


};

export function isAstBlockStatement(node: any): node is AstBlockStatement {
    return node instanceof AstBlockStatement;
}
