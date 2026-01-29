import { DumpSink } from "../DumpSink";
import { AstPattern } from "./common";
import { AstIdentifier } from "./Identifier";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export class AstRestElement extends AstNode {
    type!: 'RestElement';
    argument!: AstPattern;


    getPatternLeafs(): (AstMemberExpression | AstIdentifier)[] {
        return this.argument.getPatternLeafs();
    }

    public dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('argument').sub(this.argument);
    }

}
