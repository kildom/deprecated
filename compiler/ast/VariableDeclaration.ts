import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstBlockStatement, AstBlockStatementBase } from "./BlockStatement";
import { AstExpression } from "./Expression";
import { AstForInStatementBase } from "./ForInStatement";
import { AstFunction, AstFunctionBase } from "./Function";
import { AstIdentifier } from "./Identifier";
import { AstForStatement } from "./ForStatement";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement } from "./Statement";
import { AstPattern } from "./common";
import { collectVariables } from "../utils";

export class AstVariableDeclarator extends AstNode {
    type!: 'VariableDeclarator';
    id!: AstPattern;
    init!: AstExpression | null;
    parent!: AstVariableDeclaration;

    get kind() {
        return this.parent.kind;
    }

    public scanCollectVariables() {
        super.scanCollectVariables();
        let found = this.walkParents((parent: AstNode) => {
            if (parent instanceof AstFunctionBase ||
                (this.kind !== 'var' && (parent instanceof AstBlockStatementBase || parent instanceof AstForInStatementBase || parent instanceof AstForStatement))) {
                collectVariables(parent, this.id.getPatternLeafs());
                return true;
            }
        });
        if (!found) {
            throw new Error('Internal error: No scope to put a variable.');
        }
    }

    public dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('id').sub(this.id as AstNode) // TODO:
            .log('init').sub(this.init);
    }

    /*processPattern(id: AstPattern | null, path: (number | string)[], stage: scanCollectVariablesStage): void {
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

    processIdentifier(id: AstIdentifier, path: (string | number)[], stage: scanCollectVariables) {
        throw new Error("Method not implemented.");
    }

    scanCollectVariables(stage: scanCollectVariables): void {
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
        //this.init?.scanCollectVariables(stage);
    }*/

}

export class AstVariableDeclaration extends AstNode implements AstStatement {
    type!: 'VariableDeclaration';
    declarations!: AstVariableDeclarator[];
    kind!: 'var' | 'let' | 'const';    // since ES2015
    //    'var';
    parent!: AstProgram;


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
