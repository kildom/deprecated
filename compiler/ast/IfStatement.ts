import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";


export class AstIfStatement extends AstNode implements AstStatement {
    type!: 'IfStatement';
    test!: AstExpression;
    consequent!: AstStatement;
    alternate!: AstStatement | null;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
