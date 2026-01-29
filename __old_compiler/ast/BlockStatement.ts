import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { Variable, VariablesContainer } from "../Namespace";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstBlockStatementBase extends AstNode implements AstStatement, VariablesContainer {
    type!: 'BlockStatement' | 'StaticBlock';
    body!: AstStatement[];
    parent!: AstProgram;

    variables: Variable[] = [];

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('variables:', this.variables);
        out.log('body:');
        out.sub(this.body);
    }
}

export class AstBlockStatement extends AstBlockStatementBase {
    type!: 'BlockStatement';
}
