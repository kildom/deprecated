import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement } from "./Statement";


export class AstDebuggerStatement extends AstNode implements AstStatement {
    type!: 'DebuggerStatement';
    parent: AstProgram;

    processVariables() {}

    generate(gen: BytecodeGenerator): void {
        gen.emitDebug();
    }
}
