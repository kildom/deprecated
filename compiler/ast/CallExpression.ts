import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstSuper, AstChainElement } from "../estree";
import { AstExpression } from "./Expression";
import { AstMemberExpression } from "./MemberExpression";
import { AstSpreadElement } from "./SpreadElement";

export class AstCallExpression extends AstExpression implements AstChainElement {
    type!: 'CallExpression';
    callee!: AstExpression | AstSuper;
    arguments!: (AstExpression | AstSpreadElement)[];
    // from AstChainElement
    optional!: boolean;

    protected initialize() {
        this.setParent(this.callee, this.arguments);
    }

    generate(gen: BytecodeGenerator) {
        if (this.callee instanceof AstMemberExpression) {
            this.callee.generateAccessPair(gen, true); // object | object | member_name
            gen.emitGet();                             // object | member
            if (this.optional) {
                let gen2 = gen.newBlock();
                let blockLabel = gen2.newLabel();
                gen2.emitSwap();
                gen2.emitPop();
                gen2.emitBranch(); // TODO: Top of chain stack
                gen.emitBranchIfNullish(blockLabel);
            }
            this.generateArguments(gen);               // object | member | ...args | args count
            gen.emitCallMember();               // result
        } else {
            this.callee.generate(gen);     // callable
            if (this.optional) {
                gen.emitBranchIfNullish(); // TODO: Top of chain stack
            }
            this.generateArguments(gen);   // callable | ...args | args count
            gen.emitCall();               // result
        }
    }

    generateArguments(gen: BytecodeGenerator) {
        let i = 0;
        while (i < this.arguments.length) {
            let arg = this.arguments[i];
            if (arg instanceof AstSpreadElement) {
                break;
            } else {
                arg.generate(gen);
            }
            i++;
        }
        gen.emitPushInt(i);
        let normalArgCount = 0;
        while (i < this.arguments.length) {
            let arg = this.arguments[i];
            if (arg instanceof AstSpreadElement) {
                arg.argument.generate(gen);
                gen.emitSpread();
            } else {
                arg.generate(gen);
                gen.emitSwap();
                normalArgCount++;
            }
            i++;
        }
        if (normalArgCount > 0) {
            gen.emitPushInt(normalArgCount);
            gen.emitAdd();
        }
    }
}
