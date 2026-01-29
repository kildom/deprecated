import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstCallExpression } from "./CallExpression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export type ExpressionParent = AstCallExpression | AstExpressionStatement | AstMemberExpression;

export interface AstExpression extends AstNode {
    parent: ExpressionParent;
    generate(gen: BytecodeGenerator): void;
    dump(out: DumpSink): void;
}
