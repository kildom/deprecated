import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstArrayPattern, AstBlockStatementBase, AstForInStatement, AstForInStatementBase, AstForStatement, AstPattern, AstRestElement } from "../estree";
import { AstExpression } from "./Expression";
import { AstFunction } from "./Function";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstAssignmentProperty } from "./ObjectPattern";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";

export class AstVariableDeclarator extends AstNode {
    type!: 'VariableDeclarator';
    id!: AstPattern;
    init!: AstExpression | null;
    parent!: AstVariableDeclaration;

    public dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('id').sub(this.id as AstNode) // TODO:
            .log('init').sub(this.init);
    }

    processPattern(id: AstPattern | null, path: (number | string)[], stage: ProcessVariablesStage): void {
        if (id === null) {
            // do nothing
        } else if (id.type == 'Identifier') {
            this.processIdentifier(id, path, stage);
        } else if (id.type == 'ArrayPattern') {
            for (let i = 0; i < id.elements.length; i++) {
                this.processPattern(id.elements[i], [...path, i], stage);
            }
        } else if (id.type == 'ObjectPattern') {
            throw new Error('Not implemented'); // TODO: implement object patterns
        }
    }

    processIdentifier(id: AstIdentifier, path: (string | number)[], stage: ProcessVariablesStage) {
        throw new Error("Method not implemented.");
    }

    processVariables(stage: ProcessVariablesStage): void {
        let parent: AstNode = this.parent.parent;
        let namespace: AstFunction | AstBlockStatementBase | AstForStatement | AstForInStatementBase;
        while (true) {
            if (this.parent.kind == 'var' && (parent instanceof AstFunction)) {
                namespace = parent;
                break;
            } else if (parent instanceof AstBlockStatement) {

            }
            parent = (parent as any).parent as AstNode;
            if (!parent) {
                throw new Error("Internal error. Parent chain invalid.");
            }
        }
        this.processPattern(this.id, [], stage);
        //this.init?.processVariables(stage);
    }

}

export class AstVariableDeclaration extends AstNode implements AstStatement {
    type!: 'VariableDeclaration';
    declarations!: AstVariableDeclarator[];
    kind!: 'var' | 'let' | 'const';    // since ES2015
    //    'var';
    parent!: AstProgram;

    protected initialize(): void {
        this.setParent(this.declarations);
    }

    processVariables(stage: ProcessVariablesStage): void {
        for (let decl of this.declarations) {
            decl.processVariables(stage);
        }
    }

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }

    dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('kind:', this.kind)
            .log('declarations:').sub(this.declarations);
    }
}
