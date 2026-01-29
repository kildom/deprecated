import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstTemplateElement } from "./TemplateElement";
import { AstTemplateLiteralContainers } from './helpers/TemplateLiteralHelper';

export class AstTemplateLiteral extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#templateliteral

    declare type: "TemplateLiteral";

    declare quasis: AstTemplateElement[];
    declare expressions: AstExpression[];

    declare container: AstTemplateLiteralContainers;

    declare components: (AstTemplateElement | AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstTemplateLiteral(node: any): node is AstTemplateLiteral {
    return node instanceof AstTemplateLiteral;
}
