import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstDeclaration } from "../estree";
import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstModuleSpecifierBase } from "./ModuleSpecifier";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement, ProcessVariablesStage } from "./Statement";

export class AstExportSpecifier extends AstModuleSpecifierBase {    // since ES2015
    type!: 'ExportSpecifier';
    exported!: AstIdentifier | AstLiteral;    // since ES2022
    //        AstIdentifier;
    local!: AstIdentifier | AstLiteral;    // since ES2022

    public dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('exported').sub(this.exported)
            .log('local').sub(this.local);
    }
}

export class AstExportNamedDeclaration extends AstNode implements AstStatement {
    type!: 'ExportNamedDeclaration';
    declaration!: AstDeclaration | null;
    specifiers!: AstExportSpecifier[];
    source!: AstLiteral | null;
    parent!: AstProgram;

    processVariables(stage: ProcessVariablesStage): void {
        throw new Error("Method not implemented.");
    }

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }

    public dump(out: DumpSink): void {
        super.dump(out);
        out
            .log('declaration').sub(this.declaration)
            .log('specifiers').sub(this.specifiers)
            .log('source').sub(this.source);

    }
}

