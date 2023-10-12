import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstImportOrExportDeclaration, AstPattern } from "./common";
import { AstBlockStatement } from "./BlockStatement";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";


export class AstFunctionBase extends AstNode {
    id!: AstIdentifier | null;
    params!: AstPattern[];
    body!: AstBlockStatement | AstExpression | (AstStatement | AstImportOrExportDeclaration)[];
    generator!: boolean;    // since ES2015
    async!: boolean;    // since ES2017
}

export class AstFunction extends AstFunctionBase {
    body!: AstBlockStatement;
}

export class AstFunctionExpression extends AstFunction implements AstExpression {
    type!: 'FunctionExpression';
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstFunctionDeclaration extends AstFunction implements AstStatement {
    type!: 'FunctionDeclaration';
    id!: AstIdentifier;
    name!: string;
    parent!: AstProgram;

    protected initialize(): void {
        this.name = this.id.name;
    }

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}

export class AstArrowFunctionExpression extends AstFunctionBase implements AstExpression {
    type!: 'ArrowFunctionExpression';
    body!: AstBlockStatement | AstExpression;
    expression!: boolean;
    generator!: false;
    parent!: ExpressionParent;


    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
