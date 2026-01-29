import { AstNode } from "./Node";
import { AstTemplateLiteral } from "./TemplateLiteral";

export class AstTemplateElement extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#templateelement
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2018.md#template-literals

    declare type: "TemplateElement";

    declare tail: boolean;
    declare value: {
        cooked: string | null;
        raw: string;
    };

    declare container: AstTemplateLiteral;

    declare components: never[];


};

export function isAstTemplateElement(node: any): node is AstTemplateElement {
    return node instanceof AstTemplateElement;
}
