import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstBlockStatement } from "../ast/BlockStatement";
import { AstNode } from "../ast/Node";
import { AstStatement} from "../ast/Statement";
import { AstPattern } from "./common";
import { AstProgram } from "./Program";



export class AstTryStatement extends AstNode implements AstStatement {
    type!: 'TryStatement';
    block!: AstBlockStatement;
    handler!: AstCatchClause | null;
    finalizer!: AstBlockStatement | null;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        // TODO
    }
}

export class AstCatchClause extends AstNode implements AstNode {
    type!: 'CatchClause';
    param!: AstPattern | null;    // since ES2019
    //     AstPattern;
    body!: AstBlockStatement;
}
