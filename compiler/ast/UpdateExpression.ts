import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export type AstUpdateOperator = '++' | '--';

export class AstUpdateExpression extends AstNode implements AstExpression {
    type!: 'UpdateExpression';
    operator!: AstUpdateOperator;
    argument!: AstExpression;
    prefix!: boolean;
    parent!: ExpressionParent;
    
    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
