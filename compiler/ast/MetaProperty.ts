import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpressionSymbol } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstMetaPropertyContainers } from './helpers/MetaPropertyHelper';

export class AstMetaProperty extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#metaproperty

    declare type: "MetaProperty";

    declare meta: AstIdentifier;
    declare property: AstIdentifier;

    declare container: AstMetaPropertyContainers;

    declare components: (AstIdentifier)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstMetaProperty(node: any): node is AstMetaProperty {
    return node instanceof AstMetaProperty;
}
