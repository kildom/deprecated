import { Application } from "../Application";
import { AstArrayPattern } from "./ArrayPattern";
import { AstAssignmentPattern } from "./AssignmentPattern";
import { AstCallExpression } from "./CallExpression";
import { AstChainExpression } from "./ChainExpression";
import { AstClassBody, AstClassDeclaration, AstClassExpression, AstMethodDefinition, AstPrivateIdentifier, AstPropertyDefinition } from "./Class";
import { AstExportAllDeclaration, AstExportDefaultDeclaration } from "./Export";
import { AstExportNamedDeclaration, AstExportSpecifier } from "./ExportNamedDeclaration";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstArrowFunctionExpression, AstFunction, AstFunctionBase, AstFunctionDeclaration, AstFunctionExpression } from "./Function";
import { AstIdentifier } from "./Identifier";
import { AstImportDeclaration, AstImportDefaultSpecifier, AstImportNamespaceSpecifier, AstImportSpecifier } from "./Import";
import { AstLiteral } from "./Literal";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { AstAssignmentProperty, AstObjectPattern } from "./ObjectPattern";
import { AstProgram } from "./Program";
import { AstProperty } from "./Property";
import { AstRestElement } from "./RestElement";
import { AstSpreadElement } from "./SpreadElement";
import { AstSuper } from "./Super";
import { AstVariableDeclaration, AstVariableDeclarator } from "./VariableDeclaration";
import { AstWithStatement } from "./WithStatement";
import { AstForOfStatement } from "./ForOfStatement";
import { AstYieldExpression } from "./YieldExpression";
import { AstTaggedTemplateExpression, AstTemplateElement, AstTemplateLiteral } from "./TemplateLiteral";
import { AstSequenceExpression } from "./SequenceExpression";
import { AstNewExpression } from "./NewExpression";
import { AstConditionalExpression } from "./ConditionalExpression";
import { AstLogicalExpression } from "./LogicalExpression";
import { AstAssignmentExpression } from "./AssignmentExpression";
import { AstBinaryExpression } from "./BinaryExpression";
import { AstUpdateExpression } from "./UpdateExpression";
import { AstUnaryExpression } from "./UnaryExpression";
import { AstObjectExpression } from "./ObjectExpression";
import { AstArrayExpression } from "./ArrayExpression";
import { AstThisExpression } from "./ThisExpression";
import { AstForInStatement } from "./ForInStatement";
import { AstForStatement } from "./ForStatement";
import { AstMetaProperty } from "./MetaProperty";
import { AstAwaitExpression } from "./AwaitExpression";
import { AstStaticBlock } from "./StaticBlock";
import { AstBlockStatement } from "./BlockStatement";
import { AstEmptyStatement } from "./Statement";
import { AstDebuggerStatement } from "./DebuggerStatement";
import { AstReturnStatement } from "./ReturnStatement";
import { AstBreakStatement, AstContinueStatement, AstLabeledStatement } from "./BreakStatement";
import { AstIfStatement } from "./IfStatement";
import { AstSwitchCase, AstSwitchStatement } from "./SwitchStatement";
import { AstThrowStatement } from "./ThrowStatement";
import { AstCatchClause, AstTryStatement } from "./TryStatement";
import { AstDoWhileStatement, AstWhileStatement } from "./WhileStatement";

export type AstDeclaration = AstFunctionDeclaration | AstVariableDeclaration | AstClassDeclaration;

export type AstPattern = AstObjectPattern | AstArrayPattern | AstRestElement | AstAssignmentPattern | AstMemberExpression | AstIdentifier;

export type AstImportOrExportDeclaration = AstImportDeclaration | AstExportNamedDeclaration | AstExportDefaultDeclaration | AstExportAllDeclaration;

export type AstChainElement = AstCallExpression | AstMemberExpression;




const classList: { [key: string]: Function } = {
    ForOfStatement: AstForOfStatement,
    Super: AstSuper,
    SpreadElement: AstSpreadElement,
    ArrowFunctionExpression: AstArrowFunctionExpression,
    YieldExpression: AstYieldExpression,
    TemplateLiteral: AstTemplateLiteral,
    TaggedTemplateExpression: AstTaggedTemplateExpression,
    TemplateElement: AstTemplateElement,
    Property: AstProperty,
    ObjectPattern: AstObjectPattern,
    ArrayPattern: AstArrayPattern,
    RestElement: AstRestElement,
    AssignmentPattern: AstAssignmentPattern,
    ClassBody: AstClassBody,
    MethodDefinition: AstMethodDefinition,
    ClassDeclaration: AstClassDeclaration,
    ClassExpression: AstClassExpression,
    MetaProperty: AstMetaProperty,
    ImportDeclaration: AstImportDeclaration,
    ImportSpecifier: AstImportSpecifier,
    ImportDefaultSpecifier: AstImportDefaultSpecifier,
    ImportNamespaceSpecifier: AstImportNamespaceSpecifier,
    ExportNamedDeclaration: AstExportNamedDeclaration,
    ExportSpecifier: AstExportSpecifier,
    FunctionDeclaration: AstFunctionDeclaration,
    ExportDefaultDeclaration: AstExportDefaultDeclaration,
    ExportAllDeclaration: AstExportAllDeclaration,
    AwaitExpression: AstAwaitExpression,
    PropertyDefinition: AstPropertyDefinition,
    PrivateIdentifier: AstPrivateIdentifier,
    StaticBlock: AstStaticBlock,
    Identifier: AstIdentifier,
    Literal: AstLiteral,
    Program: AstProgram,
    ExpressionStatement: AstExpressionStatement,
    BlockStatement: AstBlockStatement,
    EmptyStatement: AstEmptyStatement,
    DebuggerStatement: AstDebuggerStatement,
    WithStatement: AstWithStatement,
    ReturnStatement: AstReturnStatement,
    LabeledStatement: AstLabeledStatement,
    BreakStatement: AstBreakStatement,
    ContinueStatement: AstContinueStatement,
    IfStatement: AstIfStatement,
    SwitchStatement: AstSwitchStatement,
    SwitchCase: AstSwitchCase,
    ThrowStatement: AstThrowStatement,
    TryStatement: AstTryStatement,
    CatchClause: AstCatchClause,
    WhileStatement: AstWhileStatement,
    DoWhileStatement: AstDoWhileStatement,
    ForStatement: AstForStatement,
    ForInStatement: AstForInStatement,
    VariableDeclaration: AstVariableDeclaration,
    VariableDeclarator: AstVariableDeclarator,
    ThisExpression: AstThisExpression,
    ArrayExpression: AstArrayExpression,
    ObjectExpression: AstObjectExpression,
    FunctionExpression: AstFunctionExpression,
    UnaryExpression: AstUnaryExpression,
    UpdateExpression: AstUpdateExpression,
    BinaryExpression: AstBinaryExpression,
    AssignmentExpression: AstAssignmentExpression,
    LogicalExpression: AstLogicalExpression,
    MemberExpression: AstMemberExpression,
    ConditionalExpression: AstConditionalExpression,
    CallExpression: AstCallExpression,
    NewExpression: AstNewExpression,
    SequenceExpression: AstSequenceExpression,
};

export class NodeConverter {

    private nextUid = 100000;

    constructor(
        private app: Application
    ) { }

    convert(node: any): any {
        if (node.type in classList) {
            node.children = [];
            this.setParent(node, node);
            let proto = new (classList[node.type] as any)();
            Object.setPrototypeOf(node, proto);
            node.app = this.app;
            node.uid = this.nextUid++;
            node.parent = null;
            let initList: any[] = [];
            for (let p = node; p; p = Object.getPrototypeOf(p)) {
                if (Object.getOwnPropertyNames(p).indexOf('initialize') >= 0) {
                    initList.unshift(p.initialize);
                }
            }
            for (let init of initList) {
                init.call(node);
            }
        }
        return node;
    }

    private setParent(parent: any, value: any) {
        if (value === null || typeof value != 'object') {
            return;
        } else if (value instanceof Array) {
            for (let i = 0; i < value.length; i++) {
                this.setParent(parent, value[i]);
            }
        } else if (value instanceof AstNode) {
            if (!value.parent) {
                parent.children.push(value);
                value.parent = parent;
            } else if (parent != value.parent) {
                throw new Error('Internal error: acorn node used in multiple parents!');
            }
        } else {
            for (let key of Object.getOwnPropertyNames(value)) {
                this.setParent(parent, value[key]);
            }
        }
    }
}
