import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstImportOrExportDeclaration, AstPattern } from "./common";
import { AstBlockStatement, AstBlockStatementBase } from "./BlockStatement";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";
import { Variable, VariablesContainer } from "../Namespace";
import { DumpSink } from "../DumpSink";
import { collectVariables, isStrict } from "../utils";
import { AstMemberExpression } from "./MemberExpression";
import { CompileError } from "../Errors";


export class AstFunctionBase extends AstNode implements VariablesContainer {
    id!: AstIdentifier | null;
    params!: AstPattern[];
    body!: AstBlockStatement | AstExpression | (AstStatement | AstImportOrExportDeclaration)[];
    generator!: boolean;    // since ES2015
    async!: boolean;    // since ES2017

    strict: boolean = false;
    variables: Variable[] = [];

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('generator:', this.generator);
        out.log('async:', this.async);
        out.log('strict:', this.strict);
        out.log('variables:', this.variables);
        out.log('id:');
        out.sub(this.id);
        out.log('params:');
        out.sub(this.params);
    }

    public scanStrict(): void {
        this.strict = !!this.walkParents(parent => {
            if (parent instanceof AstFunctionBase) {
                return parent.strict;
            }
        });
        super.scanStrict();
    }

    public scanCollectVariables(): void {
        for (let param of this.params) {
            collectVariables(this, param.getPatternLeafs());
        }
        super.scanCollectVariables();
    }

}

export class AstFunction extends AstFunctionBase {
    body!: AstBlockStatement;

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('body:');
        out.sub(this.body);
    }
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
    parent!: AstProgram | AstBlockStatementBase;

    protected initialize(): void {
        this.name = this.id.name;
    }

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('name:', this.name);
    }

    public scanCollectVariables(): void {
        let scope: AstBlockStatementBase | AstFunctionBase | undefined;
        if (isStrict(this.parent)) {
            scope = this.walkParents(p => p instanceof AstFunctionBase ? p : undefined);
        } else {
            scope = this.walkParents(p => (p instanceof AstBlockStatementBase) || (p instanceof AstFunctionBase) ? p : undefined);
        }
        if (!scope) {
            throw new Error('Internal error: Cannot find function declaration scope.');
        }
        scope.variables.push(new Variable(this.name));
        super.scanCollectVariables();
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
