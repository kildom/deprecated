import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstCallExpression } from "./CallExpression";
import { AstExpression } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstIdentifier } from "./Identifier";
import { AstNode } from "./Node";
import { AstSuper } from "./Super";

export class AstMemberExpression extends AstNode implements AstExpression {
    type!: 'MemberExpression';
    object!: AstExpression | AstSuper;
    property!: AstExpression;// TODO: | AstPrivateIdentifier;
    computed!: boolean;
    // from AstChainElement
    optional!: boolean; // TODO: Support chain elements
    parent!: AstMemberExpression | AstCallExpression | AstExpressionStatement;

    generateAccessPair(gen: BytecodeGenerator, duplicateObj: boolean = false) {
        this.object.generate(gen);
        if (this.optional) {
            gen.emitBranchIfNullish(); // TODO: Top of chain stack
        }
        if (duplicateObj) {
            gen.emitDup();
        }
        if (this.computed) {
            this.property.generate(gen);
        } else if (this.property instanceof AstIdentifier) {
            gen.emitPushString(this.property.name);
        } else {
            throw new Error('TODO: The message');
        }
    }

    generate(gen: BytecodeGenerator): void {
        this.generateAccessPair(gen);
        gen.emitGet();
    }

    dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('object:').sub(this.object)
            .log('property:').sub(this.property)
            .log('computed:', this.computed)
            .log('optional:', this.optional);
    }

}
