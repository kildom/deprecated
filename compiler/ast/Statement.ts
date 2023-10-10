import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";

export enum ProcessVariablesStage {
    Collect,  // Prepare all variables to be available for identifiers nodes.
    Bond,     // Bond previously prepared variables to identifiers nodes.
    Allocate, // Place variables at their destination locations.
};

export interface AstStatement extends AstNode {
    parent: AstProgram;
    processVariables(stage: ProcessVariablesStage): void;
    generate(gen: BytecodeGenerator): void;
    dump(out: DumpSink): void;
}

export class AstEmptyStatement extends AstNode implements AstStatement {

    type!: 'EmptyStatement';
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {}
    generate(gen: BytecodeGenerator): void {}
}
