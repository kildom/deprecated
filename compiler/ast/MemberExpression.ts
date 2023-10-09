import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstChainElement, AstPattern, AstPrivateIdentifier, AstSuper } from "../estree";
import { AstExpression } from "./Expression";
import { AstIdentifier } from "./Identifier";

export class AstMemberExpression extends AstExpression implements AstPattern, AstChainElement {
    type!: 'MemberExpression';
    object!: AstExpression | AstSuper;
    property!: AstExpression;// TODO: | AstPrivateIdentifier;
    computed!: boolean;
    // from AstChainElement
    optional!: boolean; // TODO: Support chain elements

    protected initialize() {
        this.setParent(this.object, this.property);
    }

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
}
