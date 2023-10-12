import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstSwitchStatement extends AstWithLabel implements AstStatement {
    type!: 'SwitchStatement';
    discriminant!: AstExpression;
    cases!: AstSwitchCase[];
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        // TODO
    }
}

export class AstSwitchCase extends AstNode {
    type!: 'SwitchCase';
    test!: AstExpression | null;
    consequent!: AstStatement[];
    parent!: AstSwitchStatement;

}
