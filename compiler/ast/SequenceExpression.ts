import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstSequenceExpressionContainers } from './helpers/SequenceExpressionHelper';

export class AstSequenceExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#sequenceexpression

    declare type: "SequenceExpression";

    declare expressions: AstExpression[];

    declare container: AstSequenceExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstSequenceExpression(node: any): node is AstSequenceExpression {
    return node instanceof AstSequenceExpression;
}
