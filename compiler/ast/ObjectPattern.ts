import { DumpSink } from "../DumpSink";
import { AstPattern } from "./common";
import { AstIdentifier } from "./Identifier";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { AstProperty } from "./Property";
import { AstRestElement } from "./RestElement";

export interface AstAssignmentProperty extends AstProperty {
    type: "Property"; // inherited
    value: AstPattern;
    kind: "init";
    method: false;
}

export class AstObjectPattern extends AstNode {    // since ES2015
    type!: 'ObjectPattern';
    properties!: (AstAssignmentProperty | AstRestElement)[];    // since ES2018
    //          AstAssignmentProperty[];

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('properties').sub(this.properties);
    }

    getPatternLeafs(): (AstMemberExpression | AstIdentifier)[] {
        return this.properties
            .reduce((arr, e) => {
                console.log(e instanceof AstRestElement);
                console.log(e instanceof AstProperty);
                console.log((e as any).value);
                console.log(Object.getPrototypeOf((e as any).value));
                if (e instanceof AstRestElement) {
                    return arr.concat(e.getPatternLeafs());
                } else {
                    return arr.concat(e.value.getPatternLeafs());
                }
            }, [] as (AstMemberExpression | AstIdentifier)[]);
    }

}
