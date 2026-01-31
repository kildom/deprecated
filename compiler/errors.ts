import { AstNode } from "./ast/Node";


export class CompileError extends Error {
    constructor(node: AstNode | null, message: string) {
        super('Error: ' +
            (node ? `${node.sourceFile}:${node.loc.start.line}:${node.loc.start.column}: ${node.type}: ` : '') +
            message
        );
    }
}
