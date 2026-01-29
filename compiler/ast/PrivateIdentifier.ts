import { AstNode } from "./Node";
import { AstPrivateIdentifierContainers } from './helpers/PrivateIdentifierHelper';

export class AstPrivateIdentifier extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#privateidentifier

    declare type: "PrivateIdentifier";

    declare name: string;

    declare container: AstPrivateIdentifierContainers;

    declare components: never[];


};

export function isAstPrivateIdentifier(node: any): node is AstPrivateIdentifier {
    return node instanceof AstPrivateIdentifier;
}
