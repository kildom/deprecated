import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstChainElement } from "./common";
import { AstCallExpression } from "./CallExpression";
import { AstExpression } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export class AstChainExpression extends AstNode implements AstExpression {
    parent!: AstCallExpression | AstMemberExpression | AstExpressionStatement;
    type!: 'ChainExpression';
    expression!: AstChainElement;

    generate(gen: BytecodeGenerator): void {
        let skipLabel = gen.newLabel();
        this.expression.generate(gen);
        gen.emitLabel(skipLabel);
    }

    dump(out: DumpSink) {
        super.dump(out);
        out.log('expression:').sub(this.expression);
    }
}
