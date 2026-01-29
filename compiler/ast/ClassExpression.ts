import { AstClass } from "./Class";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstIdentifier } from "./Identifier";
import { AstClassBody } from "./ClassBody";
import { AstClassExpressionContainers } from './helpers/ClassExpressionHelper';

export class AstClassExpression extends AstClass implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#classexpression

    declare type: "ClassExpression";

    declare id: AstIdentifier | null;
    declare superClass: AstExpression | null;
    declare body: AstClassBody;

    declare container: AstClassExpressionContainers;

    declare components: (AstIdentifier | AstExpression | AstClassBody)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstClassExpression(node: any): node is AstClassExpression {
    return node instanceof AstClassExpression;
}
