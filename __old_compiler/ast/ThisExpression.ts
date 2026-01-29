import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstCallExpression } from "./CallExpression";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export class AstThisExpression extends AstNode implements AstExpression {
    type!: 'ThisExpression';
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
