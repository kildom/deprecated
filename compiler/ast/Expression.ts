import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstCallExpression } from "./CallExpression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export abstract class AstExpression extends AstNode {
    parent!: AstCallExpression | AstExpressionStatement | AstMemberExpression;
    abstract generate(gen: BytecodeGenerator): void;
}
