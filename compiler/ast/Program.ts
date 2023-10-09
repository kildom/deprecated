
import { AstNode } from "./Node";
import { AstStatement } from "./Statement";
import { AstImportOrExportDeclaration } from "../estree";
import { BytecodeGenerator } from "../BytecodeGenerator";

export class AstProgram extends AstNode {
    type!: 'Program';
    body!: (AstStatement | AstImportOrExportDeclaration)[];
    sourceType!: 'script' | 'module';

    protected initialize() {
        this.setParent(this.body);
    }

    public generate(gen: BytecodeGenerator) {
        for (const statement of this.body) {
            statement.generate(gen);
        }
    }
}
