import { AstPattern } from "./Pattern";
import { AstExpressionIntf, AstExpressionSymbol } from "./Expression";
import { AstIdentifierContainers } from './helpers/IdentifierHelper';

export class AstIdentifier extends AstPattern implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#identifier

    declare type: "Identifier";

    declare name: string;

    declare container: AstIdentifierContainers;

    declare components: never[];



    [AstExpressionSymbol]: true = true;
};

export function isAstIdentifier(node: any): node is AstIdentifier {
    return node instanceof AstIdentifier;
}
