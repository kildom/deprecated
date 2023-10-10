import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstNode } from "./Node";

export class AstModuleSpecifierBase extends AstNode {    // since ES2015
    local!: AstIdentifier | AstLiteral;
}

export class AstModuleSpecifier extends AstModuleSpecifierBase {    // since ES2015
    local!: AstIdentifier;
}
