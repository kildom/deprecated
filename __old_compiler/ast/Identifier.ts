import { BytecodeGenerator } from "../BytecodeGenerator";
import { DumpSink } from "../DumpSink";
import { AstPattern, AstPatternInterface } from "./common";
import { AstCallExpression } from "./CallExpression";
import { AstExpression } from "./Expression";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstFunction } from "./Function";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstWithStatement } from "./WithStatement";

export class AstIdentifier extends AstNode implements AstExpression, AstPatternInterface {
    type!: 'Identifier';
    name!: string;
    parent!: AstMemberExpression | AstExpressionStatement | AstCallExpression;

    protected initialize(): void {
    }

    generate(gen: BytecodeGenerator): void {
    }

    dump(out: DumpSink): void {
        super.dump(out);
        out.log('name:', this.name);
    }

    getPatternLeafs(): (AstMemberExpression | AstIdentifier)[] {
        return [this];
    }
}
