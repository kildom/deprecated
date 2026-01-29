import { AstPattern } from "./Pattern";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstChainElementIntf, AstChainElementSymbol } from "./ChainElement";
import { AstSuper } from "./Super";
import { AstPrivateIdentifier } from "./PrivateIdentifier";
import { AstMemberExpressionContainers } from './helpers/MemberExpressionHelper';

export class AstMemberExpression extends AstPattern implements AstExpressionIntf, AstChainElementIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#memberexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#expressions
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2020.md#chainexpression
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#privateidentifier

    declare type: "MemberExpression";

    declare optional: boolean;
    declare object: AstExpression | AstSuper;
    declare property: AstExpression | AstPrivateIdentifier;
    declare computed: boolean;

    declare container: AstMemberExpressionContainers;

    declare components: (AstExpression | AstSuper | AstPrivateIdentifier)[];



    [AstExpressionSymbol]: true = true;
    [AstChainElementSymbol]: true = true;
};

export function isAstMemberExpression(node: any): node is AstMemberExpression {
    return node instanceof AstMemberExpression;
}
