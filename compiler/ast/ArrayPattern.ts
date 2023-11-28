import { DumpSink } from "../DumpSink";
import { AstPattern } from "./common";
import { AstIdentifier } from "./Identifier";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export class AstArrayPattern extends AstNode {
    type!: 'ArrayPattern';
    elements!: (AstPattern | null)[];

    getPatternLeafs(): (AstMemberExpression | AstIdentifier)[] {
        return this.elements
            .reduce((arr, e) => e ? arr.concat(e.getPatternLeafs()) : arr, [] as (AstMemberExpression | AstIdentifier)[]);
    }

    public dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('elements').sub(this.elements);
    }

}
