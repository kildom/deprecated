import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression } from "./Expression";

export class AstLiteral extends AstExpression {
    type!: 'Literal';
    value!: string | boolean | null | number | RegExp | bigint;
    raw!: string;

    generate(gen: BytecodeGenerator): void {
        switch (typeof this.value) {
            case 'string':
                gen.emitPushString(this.value);
                break;
            case 'boolean':
                gen.emitPushBool(this.value);
                break;
            case 'number':
                gen.emitPushNumber(this.value);
                break;
            case 'bigint':
                gen.emitPushBitInt(this.value);
                break;
            case 'object':
                if (this.value === null) {
                    gen.emitPushNull();
                } else {
                    gen.emitPushRegExp(this.value);
                }
                break;
        }
    }
}
