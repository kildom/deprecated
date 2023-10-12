import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstNode } from "./Node";

export class AstTemplateElement extends AstNode {
    type!: 'TemplateElement';
    tail!: boolean;
    value!: {
        cooked: string | null;
        raw: string;
    };
}

export class AstTemplateLiteral extends AstNode implements AstExpression {
    type!: 'TemplateLiteral';
    quasis!: AstTemplateElement[];
    expressions!: AstExpression[];
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstTaggedTemplateExpression extends AstNode implements AstExpression {
    type!: 'TaggedTemplateExpression';
    tag!: AstExpression;
    quasi!: AstTemplateLiteral;
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}
