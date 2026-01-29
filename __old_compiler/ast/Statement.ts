import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstBlockStatementBase } from "./BlockStatement";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";


export interface AstStatement extends AstNode {
    parent: AstProgram | AstBlockStatementBase;
    generate(gen: BytecodeGenerator): void;
    dump(out: DumpSink): void;
}

export class AstEmptyStatement extends AstNode implements AstStatement {

    type!: 'EmptyStatement';
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {}
}
