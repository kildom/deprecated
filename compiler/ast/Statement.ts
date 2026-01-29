import { AstNode } from "./Node";
import { AstStatementContainers, AstStatementComponents } from './helpers/StatementHelper';

export class AstStatement extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#statements

    declare type:
        | "ExpressionStatement"
        | "BlockStatement"
        | "StaticBlock"
        | "EmptyStatement"
        | "DebuggerStatement"
        | "WithStatement"
        | "ReturnStatement"
        | "LabeledStatement"
        | "BreakStatement"
        | "ContinueStatement"
        | "IfStatement"
        | "SwitchStatement"
        | "ThrowStatement"
        | "TryStatement"
        | "WhileStatement"
        | "DoWhileStatement"
        | "ForStatement"
        | "ForInStatement"
        | "ForOfStatement"
        | "FunctionDeclaration"
        | "VariableDeclaration"
        | "ClassDeclaration";


    declare container: AstStatementContainers;

    declare components: AstStatementComponents[];


};

export function isAstStatement(node: any): node is AstStatement {
    return node instanceof AstStatement;
}
