import { AstFunction } from "./Function";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstDirective } from "./Directive";
import { AstWithStatement } from "./WithStatement";
import { AstReturnStatement } from "./ReturnStatement";
import { AstLabeledStatement } from "./LabeledStatement";
import { AstBreakStatement } from "./BreakStatement";
import { AstContinueStatement } from "./ContinueStatement";
import { AstIfStatement } from "./IfStatement";
import { AstSwitchStatement } from "./SwitchStatement";
import { AstSwitchCase } from "./SwitchCase";
import { AstThrowStatement } from "./ThrowStatement";
import { AstCatchClause } from "./CatchClause";
import { AstWhileStatement } from "./WhileStatement";
import { AstDoWhileStatement } from "./DoWhileStatement";
import { AstForStatement } from "./ForStatement";
import { AstForInStatement } from "./ForInStatement";
import { AstFunctionDeclaration } from "./FunctionDeclaration";
import { AstVariableDeclarator } from "./VariableDeclarator";
import { AstArrayExpression } from "./ArrayExpression";
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
import { AstSpreadElement } from "./SpreadElement";
import { AstArrowFunctionExpression } from "./ArrowFunctionExpression";
import { AstYieldExpression } from "./YieldExpression";
import { AstTemplateLiteral } from "./TemplateLiteral";
import { AstTaggedTemplateExpression } from "./TaggedTemplateExpression";
import { AstAssignmentProperty } from "./AssignmentProperty";
import { AstArrayPattern } from "./ArrayPattern";
import { AstRestElement } from "./RestElement";
import { AstAssignmentPattern } from "./AssignmentPattern";
import { AstClass } from "./Class";
import { AstMethodDefinition } from "./MethodDefinition";
import { AstClassDeclaration } from "./ClassDeclaration";
import { AstClassExpression } from "./ClassExpression";
import { AstMetaProperty } from "./MetaProperty";
import { AstModuleSpecifier } from "./ModuleSpecifier";
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
import { AstImportAttribute } from "./ImportAttribute";
import { AstIdentifier } from "./Identifier";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstPrivateIdentifier } from "./PrivateIdentifier";
import { AstSuper } from "./Super";
import { AstTemplateElement } from "./TemplateElement";
import { AstClassBody } from "./ClassBody";
import { AstChainElement } from "./ChainElement";
import { AstLiteral } from "./Literal";
import { AstThisExpression } from "./ThisExpression";
import { AstObjectExpression } from "./ObjectExpression";

export interface AstExpressionIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#expressions


    container: AstFunction | AstExpressionStatement | AstDirective | AstWithStatement | AstReturnStatement | AstLabeledStatement | AstBreakStatement | AstContinueStatement | AstIfStatement | AstSwitchStatement | AstSwitchCase | AstThrowStatement | AstCatchClause | AstWhileStatement | AstDoWhileStatement | AstForStatement | AstForInStatement | AstFunctionDeclaration | AstVariableDeclarator | AstArrayExpression | AstProperty | AstFunctionExpression | AstUnaryExpression | AstUpdateExpression | AstBinaryExpression | AstAssignmentExpression | AstLogicalExpression | AstMemberExpression | AstConditionalExpression | AstCallExpression | AstNewExpression | AstSequenceExpression | AstForOfStatement | AstSpreadElement | AstArrowFunctionExpression | AstYieldExpression | AstTemplateLiteral | AstTaggedTemplateExpression | AstAssignmentProperty | AstArrayPattern | AstRestElement | AstAssignmentPattern | AstClass | AstMethodDefinition | AstClassDeclaration | AstClassExpression | AstMetaProperty | AstModuleSpecifier | AstImportDeclaration | AstImportSpecifier | AstImportDefaultSpecifier | AstImportNamespaceSpecifier | AstExportNamedDeclaration | AstExportSpecifier | AstAnonymousDefaultExportedFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstExportDefaultDeclaration | AstExportAllDeclaration | AstAwaitExpression | AstChainExpression | AstImportExpression | AstPropertyDefinition | AstImportAttribute;

    components: (AstExpression | AstSpreadElement | AstProperty | AstIdentifier | AstPattern | AstBlockStatement | AstPrivateIdentifier | AstSuper | AstTemplateElement | AstTemplateLiteral | AstClassBody | AstChainElement)[];

    [AstExpressionSymbol]: true;
};

export type AstExpression =
    | AstIdentifier
    | AstLiteral
    | AstThisExpression
    | AstArrayExpression
    | AstObjectExpression
    | AstFunctionExpression
    | AstUnaryExpression
    | AstUpdateExpression
    | AstBinaryExpression
    | AstAssignmentExpression
    | AstLogicalExpression
    | AstMemberExpression
    | AstConditionalExpression
    | AstCallExpression
    | AstNewExpression
    | AstSequenceExpression
    | AstArrowFunctionExpression
    | AstYieldExpression
    | AstTemplateLiteral
    | AstTaggedTemplateExpression
    | AstClassExpression
    | AstMetaProperty
    | AstAwaitExpression
    | AstChainExpression
    | AstImportExpression

export function isAstExpression(node: any): node is AstExpressionIntf {
    return node[AstExpressionSymbol] === true;
}

export const AstExpressionSymbol = Symbol('AstExpression');
