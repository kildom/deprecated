
export class AstNode {
    start!: number;
    end!: number;
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
}
