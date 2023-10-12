import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstChainElement } from "./common";
import { AstExpression } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { AstSpreadElement } from "./SpreadElement";
import { AstSuper } from "./Super";

export class AstCallExpression extends AstNode implements AstExpression {
    type!: 'CallExpression';
    callee!: AstExpression | AstSuper;
    arguments!: (AstExpression | AstSpreadElement)[];
    // from AstChainElement
    optional!: boolean;
    parent!: AstCallExpression | AstExpressionStatement | AstMemberExpression;

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

    dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('optional:', this.optional)
            .log('callee:').sub(this.callee)
            .log('arguments:').sub(this.arguments);
    }

    /*scanCollectVariables(stage: scanCollectVariables): void {
        if (!(this.callee instanceof AstSuper)) {
            this.callee.scanCollectVariables(stage);
        }
        for (let arg of this.arguments) {
            if (arg instanceof AstSpreadElement) {
                arg.argument.scanCollectVariables(stage);
            } else {
                arg.scanCollectVariables(stage);
            }
        }
    }*/
}
