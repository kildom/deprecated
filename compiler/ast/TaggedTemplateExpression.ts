import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstTemplateLiteral } from "./TemplateLiteral";
import { AstTaggedTemplateExpressionContainers } from './helpers/TaggedTemplateExpressionHelper';

export class AstTaggedTemplateExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#taggedtemplateexpression

    declare type: "TaggedTemplateExpression";

    declare tag: AstExpression;
    declare quasi: AstTemplateLiteral;

    declare container: AstTaggedTemplateExpressionContainers;

    declare components: (AstExpression | AstTemplateLiteral)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstTaggedTemplateExpression(node: any): node is AstTaggedTemplateExpression {
    return node instanceof AstTaggedTemplateExpression;
}
