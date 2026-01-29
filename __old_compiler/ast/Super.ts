import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstCallExpression } from "./CallExpression";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";

export class AstSuper extends AstNode {    // since ES2015
    type!: 'Super';
    parent!: AstCallExpression | AstMemberExpression;
    generate(gen: BytecodeGenerator): void {
        throw new Error('not implemented');
    }
}
