import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstPattern } from "../estree";
import { AstCallExpression } from "./CallExpression";
import { AstExpression } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstFunction } from "./Function";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { ProcessVariablesStage } from "./Statement";
import { AstWithStatement } from "./WithStatement";

export class AstIdentifier extends AstNode implements AstExpression {
    type!: 'Identifier';
    name!: string;
    parent!: AstMemberExpression | AstExpressionStatement | AstCallExpression;

    generate(gen: BytecodeGenerator): void {
    }

    dump(out: DumpSink): void {
        super.dump(out);
        out.log('name:', this.name);
    }

    processVariables(stage: ProcessVariablesStage): void { }
}
