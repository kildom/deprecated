import { Application } from "../Application";
import { DumpSink } from "../DumpSink";
//import { AstProgram } from "./Program";

export class AstNode {
    type!: string;
    start!: number;
    end!: number;
    sourceFile!: string;
    app!: Application;
    uid!: number;
    parent!: AstNode | null;
    children!: AstNode[];

    protected initialize() {
    }

    public dump(out: DumpSink) {
        out.log(`${(this as any).type || '!UNKNOWN!'} #${this.uid}`);
        out.log(`location: ${this.sourceFile}:${this.start}:${this.end}`);
        out.log('parent:', (this as any).parent);
        out.log('children:', this.children);
    }

    public scanPostInit(): void {
        for (let child of this.children) {
            child.scanPostInit();
        }
    }

    public scanCollectVariables() {
        for (let child of this.children) {
            child.scanCollectVariables();
        }
    }

    public walkParents(callback: (parent: AstNode) => boolean | undefined | void): boolean {
        let parent: AstNode | null = this.parent;
        while (parent) {
            let stopIfTrue = callback(parent);
            if (stopIfTrue === true) return true;
            parent = parent.parent;
        }
        return false;
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
