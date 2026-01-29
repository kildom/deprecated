import { AstNode } from "./Node";
import { AstExpressionIntf, AstExpressionSymbol } from "./Expression";
import { AstLiteralContainers } from './helpers/LiteralHelper';

export class AstLiteral extends AstNode implements AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#literal
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2020.md#literal

    declare type: "Literal";

    declare value: string | boolean | null | number | RegExp | bigint;
    declare bigint: string;
    declare regex: {
        pattern: string;
        flags: string;
    };

    declare container: AstLiteralContainers;

    declare components: never[];



    [AstExpressionSymbol]: true = true;
};

export function isAstLiteral(node: any): node is AstLiteral {
    return node instanceof AstLiteral;
}
