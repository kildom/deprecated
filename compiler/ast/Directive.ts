import { AstExpressionStatement } from "./ExpressionStatement";
import { AstLiteral } from "./Literal";
import { AstDirectiveContainers } from './helpers/DirectiveHelper';

export class AstDirective extends AstExpressionStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#directive

    declare type: "ExpressionStatement";

    declare expression: AstLiteral;
    declare directive: string;

    declare container: AstDirectiveContainers;

    declare components: (AstLiteral)[];


};

export function isAstDirective(node: any): node is AstDirective {
    return node instanceof AstDirective;
}
