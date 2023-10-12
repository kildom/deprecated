import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstBlockStatementBase } from "./BlockStatement";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstStaticBlock extends AstNode implements AstBlockStatementBase {
    body!: AstStatement[];    // since ES2022
    type!: 'StaticBlock';
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

