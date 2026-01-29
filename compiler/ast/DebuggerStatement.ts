import { AstStatement } from "./Statement";
import { AstDebuggerStatementContainers } from './helpers/DebuggerStatementHelper';

export class AstDebuggerStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#debuggerstatement

    declare type: "DebuggerStatement";


    declare container: AstDebuggerStatementContainers;

    declare components: never[];


};

export function isAstDebuggerStatement(node: any): node is AstDebuggerStatement {
    return node instanceof AstDebuggerStatement;
}
