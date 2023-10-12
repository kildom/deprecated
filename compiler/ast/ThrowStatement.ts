import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstThrowStatement extends AstNode implements AstStatement {
    type!: 'ThrowStatement';
    argument!: AstExpression;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
