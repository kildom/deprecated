import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstCallExpression } from "./CallExpression";
import { AstExpression } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";


export class AstLiteral extends AstNode implements AstExpression {
    type!: 'Literal';
    value!: string | boolean | null | number | RegExp | bigint;
    raw!: string;
    regex?: {
        pattern: string; flags: string;
    };
    bigint?: string;
    parent!: AstMemberExpression | AstExpressionStatement | AstCallExpression;

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

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('raw:', this.raw);
    }

}
