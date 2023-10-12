import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstPattern } from "./common";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export type AstAssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '<<=' | '>>=' | '>>>=' | '|=' | '^=' | '&=' | /* since ES2016: */ '**=' | /* since ES2021: */ '||=' | '&&=' | '??=';

export class AstAssignmentExpression extends AstNode implements AstExpression {
    type!: 'AssignmentExpression';
    operator!: AstAssignmentOperator;
    left!: AstPattern;
    right!: AstExpression;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
