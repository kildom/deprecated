import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstChainElement } from "../estree";
import { AstExpression } from "./Expression";

export class AstChainExpression extends AstExpression {
    type!: 'ChainExpression';
    expression!: AstChainElement;

    generate(gen: BytecodeGenerator): void {
        let skipLabel = gen.newLabel();
        this.expression.generate(gen);
        gen.emitLabel(skipLabel);
    }
}
