
import * as util from 'node:util';
import { AstNode } from './ast/Node';

const INDENT_LEN = 2;
const INDENT = ' '.repeat(INDENT_LEN);

export class DumpSink {

    private indent: string = '';
    private all = new Set<AstNode>();
    private done = new Set<AstNode>();

    public log(...args: any[]) {
        let formatted: string[] = [];
        for (let arg of args) {
            if (arg instanceof AstNode) {
                this.all.add(arg);
                formatted.push('#' + arg.uid); // TODO: colors
            } else if ((arg instanceof Array) && arg.length > 0 && (arg[0] instanceof AstNode)) {
                for (let n of arg) {
                    this.all.add(n);
                    formatted.push('#' + n.uid); // TODO: colors
                }
            } else if (typeof (arg) === 'string') {
                formatted.push(arg);
            } else {
                formatted.push(util.inspect(arg, { showHidden: false, depth: null, colors: true }));
            }
        }
        let text = this.indent + formatted.join(' ').replace(/\n/g, '\n' + this.indent);
        console.log(text);
        return this;
    }

    public sub(arg: AstNode | (AstNode | null)[] | null) {
        if (arg === null) {
            console.log(`${this.indent}${INDENT}null`);
        } else if (arg instanceof Array) {
            if (arg.length == 0) {
                console.log(`${this.indent}${INDENT}[]`);
            }
            for (let i = 0; i < arg.length; i++) {
                let cur = arg[i];
                if (!cur) {
                    console.log(`${this.indent}[${i}] => null`);
                } else if (this.done.has(cur)) {
                    console.log(`${this.indent}[${i}] => #${cur.uid}`);
                } else {
                    this.done.add(cur);
                    console.log(`${this.indent}[${i}]`);
                    this.indent += INDENT;
                    if ('dump' in cur) {
                        cur.dump(this);
                    } else {
                        console.log(`${this.indent}${(cur as any).type} - NOT IMPLEMENTED`)
                    }
                    this.indent = this.indent.substring(0, this.indent.length - INDENT_LEN);
                }
            }
        } else {
            if (this.done.has(arg)) {
                console.log(`${this.indent}${INDENT}=> #${arg.uid}`);
            } else {
                this.done.add(arg);
                this.indent += INDENT;
                if ('dump' in arg) {
                    arg.dump(this);
                } else {
                    console.log(`${this.indent}${(arg as any).type} - NOT IMPLEMENTED`)
                }
            this.indent = this.indent.substring(0, this.indent.length - INDENT_LEN);
            }
        }
        return this;
    }

    public finalize() {
        let dangling = [...this.all].filter(node => !this.done.has(node));
        if (dangling.length) {
            console.log(`Dangling children:`);
            this.sub(dangling);
        }
    }
};

