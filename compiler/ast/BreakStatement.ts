import { BytecodeGenerator } from "../BytecodeGenerator";
import { CompileError } from "../Errors";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";

export class AstBreakStatement extends AstNode implements AstStatement {
    type!: 'BreakStatement';
    label!: AstIdentifier | null;
    parent!: AstProgram;

    processVariables() { }

    generate(gen: BytecodeGenerator): void {
        // TODO
    }
}

export class AstContinueStatement extends AstNode implements AstStatement {
    type!: 'ContinueStatement';
    label!: AstIdentifier | null;
    parent!: AstProgram;

    processVariables() { }

    generate(gen: BytecodeGenerator): void {
        // TODO
    }
}

export class AstLabeledStatement extends AstNode implements AstStatement {
    type!: 'LabeledStatement';
    label!: AstIdentifier;
    body!: AstStatement;
    parent!: AstProgram;

    protected initialize(): void {
        if (this.body instanceof AstWithLabel) {
            this.body.setLabel(this.label.name);
        } else {
            throw new CompileError(this, 'Unexpected label');
        }
    }

    processVariables(stage: ProcessVariablesStage): void {
        this.body.processVariables(stage);
    }

    generate(gen: BytecodeGenerator): void {
        this.body.generate(gen);
    }
}

export class AstWithLabel extends AstNode {
    label?: string;

    setLabel(label: string): void {
        this.label = label;
    }
}
