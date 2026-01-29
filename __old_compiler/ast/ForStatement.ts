import { BytecodeGenerator } from "../BytecodeGenerator";
import { Variable, VariablesContainer } from "../Namespace";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";
import { AstVariableDeclaration } from "./VariableDeclaration";

export class AstForStatement extends AstWithLabel implements AstStatement, VariablesContainer {
    type!: 'ForStatement';
    init!: AstVariableDeclaration | AstExpression | null;
    test!: AstExpression | null;
    update!: AstExpression | null;
    body!: AstStatement;
    parent!: AstProgram;

    variables: Variable[] = [];

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
