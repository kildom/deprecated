import { AstNode } from "./ast/Node";


export class CompileError extends Error {
    constructor(node: AstNode | null, message: string) {
        super(message + (node ? ` :: Node ${node.sourceFile}:${node.start}:${node.end}:${(node as any).type}` : ''));
    }
}
