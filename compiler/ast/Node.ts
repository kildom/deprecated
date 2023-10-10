import { Application } from "../Application";
import { DumpSink } from "../DumpSink";
//import { AstProgram } from "./Program";

export class AstNode {
    start!: number;
    end!: number;
    sourceFile!: string;
    app!: Application;
    uid!: number;
    parent!: AstNode | null;

    protected initialize() {
    }

    protected setParent<Tthis>(this: Tthis, ...args: ({ parent: Tthis } | { parent: Tthis }[])[]) {
        for (const arg of args) {
            if (arg instanceof Array) {
                for (const c of arg) {
                    c.parent = this;
                }
            } else {
                arg.parent = this;
            }
        }
    }

    public dump(out: DumpSink) {
        out.log(`${(this as any).type || '!UNKNOWN!'} #${this.uid}`);
        out.log(`location: ${this.sourceFile}:${this.start}:${this.end}`);
        if ((this as any).parent) {
            out.log('parent:', (this as any).parent);
        }
    }

    /*public *parents(thisIncluded: boolean = false) {
        if (thisIncluded) {
            yield this;
        }
        let parent = (this as any).parent as AstNode;
        while (parent) {
            yield parent;
            let nextParent = (parent as any).parent as AstNode;
            if (!nextParent && !(parent instanceof AstProgram)) {
                throw new Error('Internal error: Interrupted parent chain.');
            }
        }
    }*/
}
