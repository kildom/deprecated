import { AstStatement } from "./Statement";

export interface AstBlockStatementBase extends AstStatement {
    type: 'BlockStatement' | 'StaticBlock';
    body: AstStatement[];
}

export interface AstBlockStatement extends AstBlockStatementBase {
    type: 'BlockStatement';
}
