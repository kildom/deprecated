import { AstBlockStatement } from "./BlockStatement";
import { AstFunctionBase } from "./FunctionBase";

export class AstFunction extends AstFunctionBase {
    body!: AstBlockStatement;
}
