import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstCallExpression } from "./CallExpression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { ProcessVariablesStage } from "./Statement";

export type ExpressionParent = AstCallExpression | AstExpressionStatement | AstMemberExpression;

export interface AstExpression extends AstNode {
    parent: ExpressionParent;
    processVariables(stage: ProcessVariablesStage): void;
    generate(gen: BytecodeGenerator): void;
    dump(out: DumpSink): void;
}
