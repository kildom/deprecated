import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstFunction } from "./Function";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement } from "./Statement";


export class AstFunctionDeclaration extends AstFunction implements AstStatement {
    type!: 'FunctionDeclaration';
    id!: AstIdentifier;
    name!: string;
    parent!: AstProgram;

    protected initialize(): void {
        this.name = this.id.name;
    }

    processVariables(){}

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
