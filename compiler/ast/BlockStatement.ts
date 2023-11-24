import { BytecodeGenerator } from "../BytecodeGenerator";
import { Variable, VariablesContainer } from "../Namespace";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstBlockStatementBase extends AstNode implements AstStatement, VariablesContainer {
    type!: 'BlockStatement' | 'StaticBlock';
    body!: AstStatement[];
    parent!: AstProgram;

    variables: Variable[] = [];

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstBlockStatement extends AstBlockStatementBase {
    type!: 'BlockStatement';
}
