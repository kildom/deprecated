import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstCallExpression } from "./CallExpression";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { ProcessVariablesStage } from "./Statement";

export class AstThisExpression extends AstNode implements AstExpression {
    type!: 'ThisExpression';
    parent!: ExpressionParent;

    processVariables(stage: ProcessVariablesStage): void {  }

    generate(gen: BytecodeGenerator): void {
        // TODO:
    }
}
