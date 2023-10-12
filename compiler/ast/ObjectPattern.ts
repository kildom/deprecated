import { DumpSink } from "../DumpSink";
import { AstPattern } from "./common";
import { AstNode } from "./Node";
import { AstProperty } from "./Property";
import { AstRestElement } from "./RestElement";

export class AstAssignmentProperty extends AstProperty {
    type!: "Property"; // inherited
    value!: AstPattern;
    kind!: "init";
    method!: false;
}

export class AstObjectPattern extends AstNode {    // since ES2015
    type!: 'ObjectPattern';
    properties!: (AstAssignmentProperty | AstRestElement)[];    // since ES2018
    //          AstAssignmentProperty[];

    public dump(out: DumpSink): void {
        super.dump(out);
        out.log('properties').sub(this.properties);
    }

}
