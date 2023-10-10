import { AstForInStatementBase } from "./ForInStatement";

export class AstForOfStatement extends AstForInStatementBase {    // since ES2015
    type!: 'ForOfStatement';
    await!: boolean;    // since ES2018
}
