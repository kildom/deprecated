import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstClass, AstClassDeclaration } from "./Class";
import { AstExpression } from "./Expression";
import { AstFunction, AstFunctionDeclaration } from "./Function";
import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstAnonymousDefaultExportedFunctionDeclaration extends AstFunction {    // since ES2015
    type!: 'FunctionDeclaration';
    id!: null;
}

export class AstAnonymousDefaultExportedClassDeclaration extends AstClass {    // since ES2015
    type!: 'ClassDeclaration';
    id!: null;
}

export class AstExportDefaultDeclaration extends AstNode implements AstStatement {
    type!: 'ExportDefaultDeclaration';
    declaration!: AstAnonymousDefaultExportedFunctionDeclaration | AstFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstClassDeclaration | AstExpression;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }    // since ES2015
}

export class AstExportAllDeclaration extends AstNode implements AstStatement {
    type!: 'ExportAllDeclaration';
    source!: AstLiteral;
    exported!: AstIdentifier | AstLiteral | null;    // since ES2022
    //        AstIdentifier | null;    // since ES2020
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }    // since ES2015
}
