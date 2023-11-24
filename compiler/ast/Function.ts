import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstImportOrExportDeclaration, AstPattern } from "./common";
import { AstBlockStatement } from "./BlockStatement";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";
import { Variable, VariablesContainer } from "../Namespace";
import { DumpSink } from "../DumpSink";


export class AstFunctionBase extends AstNode implements VariablesContainer {
    id!: AstIdentifier | null;
    params!: AstPattern[];
    body!: AstBlockStatement | AstExpression | (AstStatement | AstImportOrExportDeclaration)[];
    generator!: boolean;    // since ES2015
    async!: boolean;    // since ES2017

    variables: Variable[] = [];

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('generator:', this.generator);
        out.log('async:', this.async);
        out.log('variables:', this.variables);
        out.log('id:');
        out.sub(this.id);
        out.log('params:');
        out.sub(this.params);
    }
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
