import { AstFunction } from "./Function";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstWithStatement } from "./WithStatement";
import { AstReturnStatement } from "./ReturnStatement";
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
import { AstAnonymousDefaultExportedFunctionDeclaration } from "./AnonymousDefaultExportedFunctionDeclaration";
import { AstAnonymousDefaultExportedClassDeclaration } from "./AnonymousDefaultExportedClassDeclaration";
import { AstExportDefaultDeclaration } from "./ExportDefaultDeclaration";
import { AstAwaitExpression } from "./AwaitExpression";
import { AstChainExpression } from "./ChainExpression";
import { AstImportExpression } from "./ImportExpression";
import { AstPropertyDefinition } from "./PropertyDefinition";
import { AstExpression } from "./Expression";
import { AstSuper } from "./Super";
import { AstPrivateIdentifier } from "./PrivateIdentifier";

export interface AstChainElementIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2020.md#chainexpression

    optional: boolean;

    container: AstFunction | AstExpressionStatement | AstWithStatement | AstReturnStatement | AstIfStatement | AstSwitchStatement | AstSwitchCase | AstThrowStatement | AstCatchClause | AstWhileStatement | AstDoWhileStatement | AstForStatement | AstForInStatement | AstFunctionDeclaration | AstVariableDeclarator | AstArrayExpression | AstProperty | AstFunctionExpression | AstUnaryExpression | AstUpdateExpression | AstBinaryExpression | AstAssignmentExpression | AstLogicalExpression | AstMemberExpression | AstConditionalExpression | AstCallExpression | AstNewExpression | AstSequenceExpression | AstForOfStatement | AstSpreadElement | AstArrowFunctionExpression | AstYieldExpression | AstTemplateLiteral | AstTaggedTemplateExpression | AstAssignmentProperty | AstArrayPattern | AstRestElement | AstAssignmentPattern | AstClass | AstMethodDefinition | AstClassDeclaration | AstClassExpression | AstAnonymousDefaultExportedFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstExportDefaultDeclaration | AstAwaitExpression | AstChainExpression | AstImportExpression | AstPropertyDefinition;

    components: (AstExpression | AstSuper | AstPrivateIdentifier | AstSpreadElement)[];

    [AstChainElementSymbol]: true;
};

export type AstChainElement =
    | AstMemberExpression
    | AstCallExpression

export function isAstChainElement(node: any): node is AstChainElementIntf {
    return node[AstChainElementSymbol] === true;
}

export const AstChainElementSymbol = Symbol('AstChainElement');
