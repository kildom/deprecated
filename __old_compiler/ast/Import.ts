import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstModuleSpecifier } from "./ModuleSpecifier";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";

export class AstImportDeclaration extends AstNode implements AstStatement {
    type!: 'ImportDeclaration';
    specifiers!: (AstImportSpecifier | AstImportDefaultSpecifier | AstImportNamespaceSpecifier)[];
    source!: AstLiteral;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstImportSpecifier extends AstModuleSpecifier {    // since ES2015
    type!: 'ImportSpecifier';
    imported!: AstIdentifier | AstLiteral;    // since ES2022
    //        AstIdentifier;
}

export class AstImportDefaultSpecifier extends AstModuleSpecifier {    // since ES2015
    type!: 'ImportDefaultSpecifier';
}

export class AstImportNamespaceSpecifier extends AstModuleSpecifier {    // since ES2015
    type!: 'ImportNamespaceSpecifier';
}
