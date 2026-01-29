import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstProgram } from "./Program";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstDirective } from "./Directive";
import { AstBlockStatement } from "./BlockStatement";
import { AstEmptyStatement } from "./EmptyStatement";
import { AstDebuggerStatement } from "./DebuggerStatement";
import { AstWithStatement } from "./WithStatement";
import { AstReturnStatement } from "./ReturnStatement";
import { AstLabeledStatement } from "./LabeledStatement";
import { AstBreakStatement } from "./BreakStatement";
import { AstContinueStatement } from "./ContinueStatement";
import { AstIfStatement } from "./IfStatement";
import { AstSwitchStatement } from "./SwitchStatement";
import { AstSwitchCase } from "./SwitchCase";
import { AstThrowStatement } from "./ThrowStatement";
import { AstTryStatement } from "./TryStatement";
import { AstCatchClause } from "./CatchClause";
import { AstWhileStatement } from "./WhileStatement";
import { AstDoWhileStatement } from "./DoWhileStatement";
import { AstForStatement } from "./ForStatement";
import { AstForInStatement } from "./ForInStatement";
import { AstFunctionDeclaration } from "./FunctionDeclaration";
import { AstVariableDeclaration } from "./VariableDeclaration";
import { AstVariableDeclarator } from "./VariableDeclarator";
import { AstThisExpression } from "./ThisExpression";
import { AstArrayExpression } from "./ArrayExpression";
import { AstObjectExpression } from "./ObjectExpression";
import { AstProperty } from "./Property";
import { AstFunctionExpression } from "./FunctionExpression";
import { AstUnaryExpression } from "./UnaryExpression";
import { AstUpdateExpression } from "./UpdateExpression";
import { AstBinaryExpression } from "./BinaryExpression";
import { AstAssignmentExpression } from "./AssignmentExpression";
import { AstLogicalExpression } from "./LogicalExpression";
import { AstMemberExpression } from "./MemberExpression";
import { AstConditionalExpression } from "./ConditionalExpression";
import { AstCallExpression } from "./CallExpression";
import { AstNewExpression } from "./NewExpression";
import { AstSequenceExpression } from "./SequenceExpression";
import { AstForOfStatement } from "./ForOfStatement";
import { AstSuper } from "./Super";
import { AstSpreadElement } from "./SpreadElement";
import { AstArrowFunctionExpression } from "./ArrowFunctionExpression";
import { AstYieldExpression } from "./YieldExpression";
import { AstTemplateLiteral } from "./TemplateLiteral";
import { AstTaggedTemplateExpression } from "./TaggedTemplateExpression";
import { AstTemplateElement } from "./TemplateElement";
import { AstAssignmentProperty } from "./AssignmentProperty";
import { AstObjectPattern } from "./ObjectPattern";
import { AstArrayPattern } from "./ArrayPattern";
import { AstRestElement } from "./RestElement";
import { AstAssignmentPattern } from "./AssignmentPattern";
import { AstClassBody } from "./ClassBody";
import { AstMethodDefinition } from "./MethodDefinition";
import { AstClassDeclaration } from "./ClassDeclaration";
import { AstClassExpression } from "./ClassExpression";
import { AstMetaProperty } from "./MetaProperty";
import { AstImportDeclaration } from "./ImportDeclaration";
import { AstImportSpecifier } from "./ImportSpecifier";
import { AstImportDefaultSpecifier } from "./ImportDefaultSpecifier";
import { AstImportNamespaceSpecifier } from "./ImportNamespaceSpecifier";
import { AstExportNamedDeclaration } from "./ExportNamedDeclaration";
import { AstExportSpecifier } from "./ExportSpecifier";
import { AstAnonymousDefaultExportedFunctionDeclaration } from "./AnonymousDefaultExportedFunctionDeclaration";
import { AstAnonymousDefaultExportedClassDeclaration } from "./AnonymousDefaultExportedClassDeclaration";
import { AstExportDefaultDeclaration } from "./ExportDefaultDeclaration";
import { AstExportAllDeclaration } from "./ExportAllDeclaration";
import { AstAwaitExpression } from "./AwaitExpression";
import { AstChainExpression } from "./ChainExpression";
import { AstImportExpression } from "./ImportExpression";
import { AstPropertyDefinition } from "./PropertyDefinition";
import { AstPrivateIdentifier } from "./PrivateIdentifier";
import { AstStaticBlock } from "./StaticBlock";
import { AstImportAttribute } from "./ImportAttribute";

export const typeTable: { [key: string]: [any, ((node: any, field: string) => boolean)?][] } = {
    "Identifier": [[AstIdentifier]],
    "Literal": [[AstLiteral]],
    "Program": [[AstProgram]],
    "ExpressionStatement": [
        [AstDirective, (node, field) => (node.directive)],
        [AstExpressionStatement],
    ],
    "BlockStatement": [[AstBlockStatement]],
    "EmptyStatement": [[AstEmptyStatement]],
    "DebuggerStatement": [[AstDebuggerStatement]],
    "WithStatement": [[AstWithStatement]],
    "ReturnStatement": [[AstReturnStatement]],
    "LabeledStatement": [[AstLabeledStatement]],
    "BreakStatement": [[AstBreakStatement]],
    "ContinueStatement": [[AstContinueStatement]],
    "IfStatement": [[AstIfStatement]],
    "SwitchStatement": [[AstSwitchStatement]],
    "SwitchCase": [[AstSwitchCase]],
    "ThrowStatement": [[AstThrowStatement]],
    "TryStatement": [[AstTryStatement]],
    "CatchClause": [[AstCatchClause]],
    "WhileStatement": [[AstWhileStatement]],
    "DoWhileStatement": [[AstDoWhileStatement]],
    "ForStatement": [[AstForStatement]],
    "ForInStatement": [[AstForInStatement]],
    "FunctionDeclaration": [
        [AstAnonymousDefaultExportedFunctionDeclaration, (node, field) => (node.id === null)],
        [AstFunctionDeclaration],
    ],
    "VariableDeclaration": [[AstVariableDeclaration]],
    "VariableDeclarator": [[AstVariableDeclarator]],
    "ThisExpression": [[AstThisExpression]],
    "ArrayExpression": [[AstArrayExpression]],
    "ObjectExpression": [[AstObjectExpression]],
    "Property": [
        [AstAssignmentProperty, (node, field) => (field === 'ObjectPattern.properties')],
        [AstProperty],
    ],
    "FunctionExpression": [[AstFunctionExpression]],
    "UnaryExpression": [[AstUnaryExpression]],
    "UpdateExpression": [[AstUpdateExpression]],
    "BinaryExpression": [[AstBinaryExpression]],
    "AssignmentExpression": [[AstAssignmentExpression]],
    "LogicalExpression": [[AstLogicalExpression]],
    "MemberExpression": [[AstMemberExpression]],
    "ConditionalExpression": [[AstConditionalExpression]],
    "CallExpression": [[AstCallExpression]],
    "NewExpression": [[AstNewExpression]],
    "SequenceExpression": [[AstSequenceExpression]],
    "ForOfStatement": [[AstForOfStatement]],
    "Super": [[AstSuper]],
    "SpreadElement": [[AstSpreadElement]],
    "ArrowFunctionExpression": [[AstArrowFunctionExpression]],
    "YieldExpression": [[AstYieldExpression]],
    "TemplateLiteral": [[AstTemplateLiteral]],
    "TaggedTemplateExpression": [[AstTaggedTemplateExpression]],
    "TemplateElement": [[AstTemplateElement]],
    "ObjectPattern": [[AstObjectPattern]],
    "ArrayPattern": [[AstArrayPattern]],
    "RestElement": [[AstRestElement]],
    "AssignmentPattern": [[AstAssignmentPattern]],
    "ClassBody": [[AstClassBody]],
    "MethodDefinition": [[AstMethodDefinition]],
    "ClassDeclaration": [
        [AstAnonymousDefaultExportedClassDeclaration, (node, field) => (node.id === null)],
        [AstClassDeclaration],
    ],
    "ClassExpression": [[AstClassExpression]],
    "MetaProperty": [[AstMetaProperty]],
    "ImportDeclaration": [[AstImportDeclaration]],
    "ImportSpecifier": [[AstImportSpecifier]],
    "ImportDefaultSpecifier": [[AstImportDefaultSpecifier]],
    "ImportNamespaceSpecifier": [[AstImportNamespaceSpecifier]],
    "ExportNamedDeclaration": [[AstExportNamedDeclaration]],
    "ExportSpecifier": [[AstExportSpecifier]],
    "ExportDefaultDeclaration": [[AstExportDefaultDeclaration]],
    "ExportAllDeclaration": [[AstExportAllDeclaration]],
    "AwaitExpression": [[AstAwaitExpression]],
    "ChainExpression": [[AstChainExpression]],
    "ImportExpression": [[AstImportExpression]],
    "PropertyDefinition": [[AstPropertyDefinition]],
    "PrivateIdentifier": [[AstPrivateIdentifier]],
    "StaticBlock": [[AstStaticBlock]],
    "ImportAttribute": [[AstImportAttribute]],
};