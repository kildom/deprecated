import { BytecodeGenerator } from "../BytecodeGenerator";
import { AstExpression, ExpressionParent } from "./Expression";
import { AstFunctionExpression } from "./Function";
import { AstIdentifier } from "./Identifier";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { AstProgram } from "./Program";
import { AstStatement} from "./Statement";
import { AstStaticBlock } from "./StaticBlock";

export class AstClass extends AstNode {    // since ES2015
    id!: AstIdentifier | null;
    superClass!: AstExpression | null;
    body!: AstClassBody;
}

export class AstClassBody extends AstNode {    // since ES2015
    type!: 'ClassBody';
    body!: (AstMethodDefinition | AstPropertyDefinition | AstStaticBlock)[];    // since ES2022
    //    AstMethodDefinition[];
}

export class AstMethodDefinition extends AstNode {    // since ES2015
    type!: 'MethodDefinition';
    key!: AstExpression | AstPrivateIdentifier;    // since ES2022
    //   AstExpression;
    value!: AstFunctionExpression;
    kind!: 'constructor' | 'method' | 'get' | 'set';
    computed!: boolean;
    static!: boolean;
}

export class AstClassDeclaration extends AstClass implements AstStatement {
    type!: 'ClassDeclaration';
    id!: AstIdentifier;
    parent!: AstProgram;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstClassExpression extends AstClass implements AstExpression {
    type!: 'ClassExpression';
    parent!: ExpressionParent;

    generate(gen: BytecodeGenerator): void {
        throw new Error("Method not implemented.");
    }
}

export class AstPropertyDefinition extends AstNode {    // since ES2022
    type!: 'PropertyDefinition';
    key!: AstExpression | AstPrivateIdentifier;
    value!: AstExpression | null;
    computed!: boolean;
    static!: boolean;
}

export class AstPrivateIdentifier extends AstNode {    // since ES2022
    type!: 'PrivateIdentifier';
    name!: string;
    parent!: AstMemberExpression;
}
