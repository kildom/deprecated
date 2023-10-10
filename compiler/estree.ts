import { BytecodeGenerator } from "./BytecodeGenerator";
import { AstBlockStatement } from "./ast/BlockStatement";
import { AstCallExpression } from "./ast/CallExpression";
import { AstExportNamedDeclaration } from "./ast/ExportNamedDeclaration";
import { AstExpression } from "./ast/Expression";
import { AstExpressionStatement } from "./ast/ExpressionStatement";
import { AstFunction } from "./ast/Function";
import { AstFunctionBase } from "./ast/FunctionBase";
import { AstFunctionDeclaration } from "./ast/FunctionDeclaration";
import { AstIdentifier } from "./ast/Identifier";
import { AstLiteral } from "./ast/Literal";
import { AstMemberExpression } from "./ast/MemberExpression";
import { AstModuleSpecifier } from "./ast/ModuleSpecifier";
import { AstNode } from "./ast/Node";
import { AstObjectPattern } from "./ast/ObjectPattern";
import { AstProgram } from "./ast/Program";
import { AstProperty } from "./ast/Property";
import { AstSpreadElement } from "./ast/SpreadElement";
import { AstStatement } from "./ast/Statement";
import { AstStaticBlock } from "./ast/StaticBlock";
import { AstVariableDeclaration } from "./ast/VariableDeclaration";

export type AstUnaryOperator = '-' | '+' | '!' | '~' | 'typeof' | 'void' | 'delete';

export type AstUpdateOperator = '++' | '--';

export type AstBinaryOperator = '==' | '!=' | '===' | '!==' | '<' | '<=' | '>' | '>=' | '<<' | '>>' | '>>>' | '+' | '-' | '*' | '/' | '%' | '|' | '^' | '&' | 'in' | 'instanceof' | /* since ES2016: */ '**';

export type AstAssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '<<=' | '>>=' | '>>>=' | '|=' | '^=' | '&=' | /* since ES2016: */ '**=' | /* since ES2021: */ '||=' | '&&=' | '??=';

export type AstLogicalOperator = '||' | '&&' | /* since ES2020: */ '??';

export type AstDeclaration = AstFunctionDeclaration | AstVariableDeclaration | AstClassDeclaration;


export interface AstArrayExpression extends AstExpression {
    type: 'ArrayExpression';
    elements: (AstExpression | AstSpreadElement | null)[];    // since ES2015
    //        (AstExpression | null)[];
}

export interface AstObjectExpression extends AstExpression {
    type: 'ObjectExpression';
    properties: (AstProperty | AstSpreadElement)[];    // since ES2018
    //          AstProperty[];
}

export interface AstFunctionExpression extends AstFunction, AstExpression {
    type: 'FunctionExpression';
}

export interface AstUnaryExpression extends AstExpression {
    type: 'UnaryExpression';
    operator: AstUnaryOperator;
    prefix: boolean;
    argument: AstExpression;
}

export interface AstUpdateExpression extends AstExpression {
    type: 'UpdateExpression';
    operator: AstUpdateOperator;
    argument: AstExpression;
    prefix: boolean;
}

export interface AstBinaryExpression extends AstExpression {
    type: 'BinaryExpression';
    operator: AstBinaryOperator;
    left: AstExpression | AstPrivateIdentifier;    // since ES2022
    //    AstExpression;
    right: AstExpression;
}

export interface AstAssignmentExpression extends AstExpression {
    type: 'AssignmentExpression';
    operator: AstAssignmentOperator;
    left: AstPattern;    // since ES2015
    //    AstPattern | AstExpression;
    right: AstExpression;
}

export interface AstLogicalExpression extends AstExpression {
    type: 'LogicalExpression';
    operator: AstLogicalOperator;
    left: AstExpression;
    right: AstExpression;
}

export interface AstConditionalExpression extends AstExpression {
    type: 'ConditionalExpression';
    test: AstExpression;
    alternate: AstExpression;
    consequent: AstExpression;
}

export interface AstNewExpression extends AstExpression {
    type: 'NewExpression';
    callee: AstExpression;
    arguments: (AstExpression | AstSpreadElement)[];    // since ES2015
    //         AstExpression[];
}

export interface AstSequenceExpression extends AstExpression {
    type: 'SequenceExpression';
    expressions: AstExpression[];
}

export type AstPattern = AstObjectPattern | AstArrayPattern | AstRestElement | AstAssignmentPattern | AstMemberExpression | AstIdentifier;

export interface AstArrowFunctionExpression extends AstFunctionBase, AstExpression {    // since ES2015
    type: 'ArrowFunctionExpression';
    body: AstBlockStatement | AstExpression;
    expression: boolean;
    generator: false;
}

export interface AstYieldExpression extends AstExpression {    // since ES2015
    type: 'YieldExpression';
    argument: AstExpression | null;
    delegate: boolean;
}

export interface AstTemplateLiteral extends AstExpression {    // since ES2015
    type: 'TemplateLiteral';
    quasis: AstTemplateElement[];
    expressions: AstExpression[];
}

export interface AstTaggedTemplateExpression extends AstExpression {    // since ES2015
    type: 'TaggedTemplateExpression';
    tag: AstExpression;
    quasi: AstTemplateLiteral;
}

export interface AstTemplateElement extends AstNode {    // since ES2015
    type: 'TemplateElement';
    tail: boolean;
    value: { cooked: string | null; raw: string; };    // since ES2018
    //     { cooked: string; raw: string; };
}

export interface AstArrayPattern {    // since ES2015
    type: 'ArrayPattern';
    elements: (AstPattern | null)[];
}

export interface AstRestElement extends AstNode {    // since ES2015
    type: 'RestElement';
    argument: AstPattern;
}

export interface AstAssignmentPattern {    // since ES2015
    type: 'AssignmentPattern';
    left: AstPattern;
    right: AstExpression;
}

export interface AstClass extends AstNode {    // since ES2015
    id: AstIdentifier | null;
    superClass: AstExpression | null;
    body: AstClassBody;
}

export interface AstClassBody extends AstNode {    // since ES2015
    type: 'ClassBody';
    body: (AstMethodDefinition | AstPropertyDefinition | AstStaticBlock)[];    // since ES2022
    //    AstMethodDefinition[];
}

export interface AstMethodDefinition extends AstNode {    // since ES2015
    type: 'MethodDefinition';
    key: AstExpression | AstPrivateIdentifier;    // since ES2022
    //   AstExpression;
    value: AstFunctionExpression;
    kind: 'constructor' | 'method' | 'get' | 'set';
    computed: boolean;
    static: boolean;
}

export interface AstClassDeclaration extends AstClass, AstStatement {    // since ES2015
    type: 'ClassDeclaration';
    id: AstIdentifier;
}

export interface AstClassExpression extends AstClass, AstExpression {    // since ES2015
    type: 'ClassExpression';
}

export interface AstMetaProperty extends AstExpression {    // since ES2015
    type: 'MetaProperty';
    meta: AstIdentifier;
    property: AstIdentifier;
}

export type AstImportOrExportDeclaration = AstImportDeclaration | AstExportNamedDeclaration | AstExportDefaultDeclaration | AstExportAllDeclaration;

export interface AstImportDeclaration extends AstStatement {    // since ES2015
    type: 'ImportDeclaration';
    specifiers: (AstImportSpecifier | AstImportDefaultSpecifier | AstImportNamespaceSpecifier)[];
    source: AstLiteral;
}

export interface AstImportSpecifier extends AstModuleSpecifier {    // since ES2015
    type: 'ImportSpecifier';
    imported: AstIdentifier | AstLiteral;    // since ES2022
    //        AstIdentifier;
}

export interface AstImportDefaultSpecifier extends AstModuleSpecifier {    // since ES2015
    type: 'ImportDefaultSpecifier';
}

export interface AstImportNamespaceSpecifier extends AstModuleSpecifier {    // since ES2015
    type: 'ImportNamespaceSpecifier';
}

export interface AstAnonymousDefaultExportedFunctionDeclaration extends AstFunction {    // since ES2015
    type: 'FunctionDeclaration';
    id: null;
}

export interface AstAnonymousDefaultExportedClassDeclaration extends AstClass {    // since ES2015
    type: 'ClassDeclaration';
    id: null;
}

export interface AstExportDefaultDeclaration extends AstStatement {    // since ES2015
    type: 'ExportDefaultDeclaration';
    declaration: AstAnonymousDefaultExportedFunctionDeclaration | AstFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstClassDeclaration | AstExpression;
}

export interface AstExportAllDeclaration extends AstStatement {    // since ES2015
    type: 'ExportAllDeclaration';
    source: AstLiteral;
    exported: AstIdentifier | AstLiteral | null;    // since ES2022
    //        AstIdentifier | null;    // since ES2020
}

export interface AstAwaitExpression extends AstExpression {    // since ES2017
    type: 'AwaitExpression';
    argument: AstExpression;
}

export interface AstBigIntLiteral extends AstLiteral {    // since ES2020
    bigint: string;
}

export type AstChainElement = AstCallExpression | AstMemberExpression;

export interface AstImportExpression extends AstExpression {    // since ES2020
    type: 'ImportExpression';
    source: AstExpression;
}

export interface AstPropertyDefinition extends AstNode {    // since ES2022
    type: 'PropertyDefinition';
    key: AstExpression | AstPrivateIdentifier;
    value: AstExpression | null;
    computed: boolean;
    static: boolean;
}

export interface AstPrivateIdentifier extends AstNode {    // since ES2022
    type: 'PrivateIdentifier';
    name: string;
    parent: AstMemberExpression;
}
