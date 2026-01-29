import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpression, AstExpressionSymbol } from "./Expression";
import { AstAwaitExpressionContainers } from './helpers/AwaitExpressionHelper';

export class AstAwaitExpression extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2017.md#awaitexpression

    declare type: "AwaitExpression";

    declare argument: AstExpression;

    declare container: AstAwaitExpressionContainers;

    declare components: (AstExpression)[];



    [AstExpressionSymbol]: true = true;
};

export function isAstAwaitExpression(node: any): node is AstAwaitExpression {
    return node instanceof AstAwaitExpression;
}
