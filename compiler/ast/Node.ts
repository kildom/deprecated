import { DumpOutput } from '../dump';
import { Application } from '../main';
import { AstFunction } from './Function';
import { AstNodeContainers, AstNodeComponents } from './helpers/NodeHelper';
import { AstProgram } from './Program';

export class AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#node-objects

    declare type:
        | "Program"
        | "FunctionDeclaration"
        | "FunctionExpression"
        | "ArrowFunctionExpression"
        | "ExpressionStatement"
        | "BlockStatement"
        | "StaticBlock"
        | "EmptyStatement"
        | "DebuggerStatement"
        | "WithStatement"
        | "ReturnStatement"
        | "LabeledStatement"
        | "BreakStatement"
        | "ContinueStatement"
        | "IfStatement"
        | "SwitchStatement"
        | "ThrowStatement"
        | "TryStatement"
        | "WhileStatement"
        | "DoWhileStatement"
        | "ForStatement"
        | "ForInStatement"
        | "ForOfStatement"
        | "VariableDeclaration"
        | "ClassDeclaration"
        | "SwitchCase"
        | "CatchClause"
        | "VariableDeclarator"
        | "Identifier"
        | "Literal"
        | "ThisExpression"
        | "ArrayExpression"
        | "ObjectExpression"
        | "UnaryExpression"
        | "UpdateExpression"
        | "BinaryExpression"
        | "AssignmentExpression"
        | "LogicalExpression"
        | "MemberExpression"
        | "ConditionalExpression"
        | "CallExpression"
        | "NewExpression"
        | "SequenceExpression"
        | "YieldExpression"
        | "TemplateLiteral"
        | "TaggedTemplateExpression"
        | "ClassExpression"
        | "MetaProperty"
        | "AwaitExpression"
        | "ChainExpression"
        | "ImportExpression"
        | "Property"
        | "ObjectPattern"
        | "ArrayPattern"
        | "RestElement"
        | "AssignmentPattern"
        | "Super"
        | "SpreadElement"
        | "TemplateElement"
        | "ClassBody"
        | "MethodDefinition"
        | "ImportDeclaration"
        | "ExportNamedDeclaration"
        | "ExportDefaultDeclaration"
        | "ExportAllDeclaration"
        | "ImportSpecifier"
        | "ImportDefaultSpecifier"
        | "ImportNamespaceSpecifier"
        | "ExportSpecifier"
        | "PropertyDefinition"
        | "PrivateIdentifier"
        | "ImportAttribute";

    declare uid: number;
    declare app: Application;
    declare program: AstProgram;
    declare func: AstFunction | null;

    declare container: AstNodeContainers;

    declare components: AstNodeComponents[];

    declare loc: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    }
    declare sourceFile: string;
    declare sourceType: "script" | "module";
    declare astDumpFields?: string[];
    declare dumpFields?: string[];

    setupPass() {
        for (let component of this.components) {
            component.setupPass();
        }
    }

    collectVariablesPass() {
        for (let component of this.components) {
            component.collectVariablesPass();
        }
    }

    dump(out: DumpOutput) {
        out('loc', `${this.sourceFile}:${this.loc.start.line}:${this.loc.start.column} - ${this.loc.end.line}:${this.loc.end.column}`);
        out('program', this.program, true, true);
        out('func', this.func, true, true);
        out('container', this.container, true, true);
        for (let field of this.astDumpFields || []) {
            out(field, (this as any)[field], false, false);
        }
        for (let field of this.dumpFields || []) {
            out(field, (this as any)[field], true, false);
        }
        out('components', this.components, true, true);
    }

};

export function isAstNode(node: any): node is AstNode {
    return node instanceof AstNode;
}

export interface SetupPassOptions {

};
