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


export type AstImportOrExportDeclaration = AstImportDeclaration | AstExportNamedDeclaration | AstExportDefaultDeclaration | AstExportAllDeclaration;

export type AstChainElement = AstCallExpression | AstMemberExpression;


export type AstPattern = AstObjectPattern | AstArrayPattern | AstRestElement | AstAssignmentPattern | AstMemberExpression | AstIdentifier;

/* directly / inside [] or {}
*                                          var  param  assign  for in/of  catch
* foo - AstIdentifier                       Y     Y      Y        Y         Y
* foo.bar - AstMemberExpression             N     N      Y        Y         N
* foo = "bar" - AstAssignmentPattern       N/Y    Y     N/Y      N/Y       N/Y
* ...foo - AstRestElement *1               N/Y    Y     N/Y      N/Y       N/Y
* [foo, bar] - AstArrayPattern              Y     Y      Y        Y         Y
* {foo: bar} - AstObjectPattern             Y     Y      Y        Y         Y
* 
*  *1 - object reset element argument cannot be object pattern (it is ok for array pattern)
* 
*/

export interface AstPatternInterface {
    getPatternLeafs(): (AstIdentifier | AstMemberExpression)[];
};


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

    convert(node: any, program: any, parent: any = null): void {
        if (node === null || typeof node != 'object') {
            // Noting to do.
        } else if (node instanceof Array) {
            for (let i = 0; i < node.length; i++) {
                this.convert(node[i], program, parent);
            }
        } else if (!(node.type in classList)) {
            for (let key of [...Object.getOwnPropertyNames(node)]) {
                this.convert(node[key], program, parent);
            }
        } else if (node.app && node.uid && node.program) {
            // Already converted.
        } else {
            let proto = new (classList[node.type] as any)();
            Object.setPrototypeOf(node, proto);
            node.children = [];
            node.app = this.app;
            node.uid = this.nextUid++;
            node.program = program;
            node.parent = parent;
            if (parent && parent.children.indexOf(node) < 0) {
                parent.children.push(node);
            }
            
            for (let key of [...Object.getOwnPropertyNames(node)]) {
                if (key != 'children' && key != 'app' && key != 'uid' && key != 'parent') {
                    this.convert(node[key], program, node);
                }
            }
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
    }
}
