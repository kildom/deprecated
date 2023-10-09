import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstPattern } from "../estree";
import { AstExpression } from "./Expression";

export class AstIdentifier extends AstExpression implements AstPattern {
    type!: 'Identifier';
    name!: string;

    generate(gen: BytecodeGenerator): void {
        console.log('TODO: get identifier');
    }
}
