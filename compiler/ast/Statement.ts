import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";


export interface AstStatement extends AstNode {
    parent: AstProgram;
    generate(gen: BytecodeGenerator): void;
    dump(out: DumpSink): void;
}

export class AstEmptyStatement extends AstNode implements AstStatement {

    type!: 'EmptyStatement';
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {}
}
