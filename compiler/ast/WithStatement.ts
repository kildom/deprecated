import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement } from "./Statement";

export class AstWithStatement extends AstNode implements AstStatement {
    type!: 'WithStatement';
    object!: AstExpression;
    body!: AstStatement;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        this.object.generate(gen);
        this.body.generate(gen);
        gen.emitPop();
    }

    processVariables(): void {
        throw new Error("Method not implemented.");
    }
}
