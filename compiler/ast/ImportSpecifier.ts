import { AstModuleSpecifier } from "./ModuleSpecifier";
import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstImportDeclaration } from "./ImportDeclaration";

export class AstImportSpecifier extends AstModuleSpecifier {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#importspecifier
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#importspecifier

    declare type: "ImportSpecifier";

    declare local: AstIdentifier;
    declare imported: AstIdentifier | AstLiteral;

    declare container: AstImportDeclaration;

    declare components: (AstIdentifier | AstLiteral)[];


};

export function isAstImportSpecifier(node: any): node is AstImportSpecifier {
    return node instanceof AstImportSpecifier;
}
