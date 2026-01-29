import { Application } from "../Application";
import { DumpSink } from "../DumpSink";

export class AstNode {
    type!: string;
    start!: number;
    end!: number;
    sourceFile!: string;
    app!: Application;
    program!: any;
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

    public scanStrict(): void {
        for (let child of this.children) {
            child.scanStrict();
        }
    }

    public scanCollectVariables() {
        for (let child of this.children) {
            child.scanCollectVariables();
        }
    }

    public walkParents<T>(callback: (parent: AstNode) => T | undefined | void): T | undefined {
        let parent: AstNode | null = this.parent;
        while (parent) {
            let result = callback(parent);
            if (result !== undefined) {
                return result;
            }
            parent = parent.parent;
        }
        return undefined;
    }

}
