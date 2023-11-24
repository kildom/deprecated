import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstPattern } from "./common";
import { AstWithLabel } from "./BreakStatement";
import { AstExpression } from "./Expression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";
import { AstVariableDeclaration } from "./VariableDeclaration";
import { Variable, VariablesContainer } from "../Namespace";


export class AstForInStatementBase extends AstWithLabel implements AstStatement, VariablesContainer {
    type!: 'ForInStatement' | 'ForOfStatement';
    left!: AstVariableDeclaration | AstPattern;
    right!: AstExpression;
    body!: AstStatement;
    parent!: AstProgram;

    variables: Variable[] = [];

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstForInStatement extends AstForInStatementBase {
    type!: 'ForInStatement';
}
