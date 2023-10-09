import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";

export abstract class AstStatement extends AstNode {
    parent!: AstProgram;
    abstract generate(gen: BytecodeGenerator): void;
}
