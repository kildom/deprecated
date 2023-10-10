
export interface AstNode { }

export type AstUnaryOperator = '-' | '+' | '!' | '~' | 'typeof' | 'void' | 'delete';

export type AstUpdateOperator = '++' | '--';

export type AstBinaryOperator = '==' | '!=' | '===' | '!==' | '<' | '<=' | '>' | '>=' | '<<' | '>>' | '>>>' | '+' | '-' | '*' | '/' | '%' | '|' | '^' | '&' | 'in' | 'instanceof' | /* since ES2016: */ '**';

export type AstAssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '<<=' | '>>=' | '>>>=' | '|=' | '^=' | '&=' | /* since ES2016: */ '**=' | /* since ES2021: */ '||=' | '&&=' | '??=';

export type AstLogicalOperator = '||' | '&&' | /* since ES2020: */ '??';

export interface AstIdentifier extends AstExpression, AstPattern {
    type: 'Identifier';
    name: string;
}

export interface AstLiteral extends AstExpression {
    type: 'Literal';
    value: string | boolean | null | number | RegExp | bigint;    // since ES2020
    //     string | boolean | null | number | RegExp;
}

export interface AstRegExpLiteral extends AstLiteral {
    regex: { pattern: string; flags: string; };
}

export interface AstProgram extends AstNode {
    type: 'Program';
    body: (AstStatement | AstImportOrExportDeclaration)[];    // since ES2015
    //    (AstDirective | AstStatement)[];
    sourceType: 'script' | 'module';    // since ES2015
}

export interface AstFunction extends AstNode {
    id: AstIdentifier | null;
    params: AstPattern[];
    body: AstFunctionBody;
    generator: boolean;    // since ES2015
    async: boolean;    // since ES2017
}

export interface AstStatement extends AstNode {
}

export interface AstExpressionStatement extends AstStatement {
    type: 'ExpressionStatement';
    expression: AstExpression;
}

export interface AstDirective extends AstExpressionStatement {
    expression: AstLiteral;
    directive: string;
}

export interface AstBlockStatement extends AstStatement {
    type: 'BlockStatement';
    body: AstStatement[];
}

export interface AstFunctionBody extends AstBlockStatement {
    body: (AstDirective | AstStatement)[];
}

export interface AstEmptyStatement extends AstStatement {
    type: 'EmptyStatement';
}

export interface AstDebuggerStatement extends AstStatement {
    type: 'DebuggerStatement';
}

export interface AstWithStatement extends AstStatement {
    type: 'WithStatement';
    object: AstExpression;
    body: AstStatement;
}

export interface AstReturnStatement extends AstStatement {
    type: 'ReturnStatement';
    argument: AstExpression | null;
}

export interface AstLabeledStatement extends AstStatement {
    type: 'LabeledStatement';
    label: AstIdentifier;
    body: AstStatement;
}

export interface AstBreakStatement extends AstStatement {
    type: 'BreakStatement';
    label: AstIdentifier | null;
}

export interface AstContinueStatement extends AstStatement {
    type: 'ContinueStatement';
    label: AstIdentifier | null;
}

export interface AstIfStatement extends AstStatement {
    type: 'IfStatement';
    test: AstExpression;
    consequent: AstStatement;
    alternate: AstStatement | null;
}

export interface AstSwitchStatement extends AstStatement {
    type: 'SwitchStatement';
    discriminant: AstExpression;
    cases: AstSwitchCase[];
}

export interface AstSwitchCase extends AstNode {
    type: 'SwitchCase';
    test: AstExpression | null;
    consequent: AstStatement[];
}

export interface AstThrowStatement extends AstStatement {
    type: 'ThrowStatement';
    argument: AstExpression;
}

export interface AstTryStatement extends AstStatement {
    type: 'TryStatement';
    block: AstBlockStatement;
    handler: AstCatchClause | null;
    finalizer: AstBlockStatement | null;
}

export interface AstCatchClause extends AstNode {
    type: 'CatchClause';
    param: AstPattern | null;    // since ES2019
    //     AstPattern;
    body: AstBlockStatement;
}

export interface AstWhileStatement extends AstStatement {
    type: 'WhileStatement';
    test: AstExpression;
    body: AstStatement;
}

export interface AstDoWhileStatement extends AstStatement {
    type: 'DoWhileStatement';
    body: AstStatement;
    test: AstExpression;
}

export interface AstForStatement extends AstStatement {
    type: 'ForStatement';
    init: AstVariableDeclaration | AstExpression | null;
    test: AstExpression | null;
    update: AstExpression | null;
    body: AstStatement;
}

export interface AstForInStatement extends AstStatement {
    type: 'ForInStatement';
    left: AstVariableDeclaration |  AstPattern;
    right: AstExpression;
    body: AstStatement;
}

export interface AstDeclaration extends AstStatement {
}

export interface AstFunctionDeclaration extends AstFunction, AstDeclaration {
    type: 'FunctionDeclaration';
    id: AstIdentifier;
}

export interface AstVariableDeclaration extends AstDeclaration {
    type: 'VariableDeclaration';
    declarations: AstVariableDeclarator[];
    kind: 'var' | 'let' | 'const';    // since ES2015
    //    'var';
}

export interface AstVariableDeclarator extends AstNode {
    type: 'VariableDeclarator';
    id: AstPattern;
    init: AstExpression | null;
}

export interface AstExpression extends AstNode {
}

export interface AstThisExpression extends AstExpression {
    type: 'ThisExpression';
}

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

export interface AstProperty extends AstNode {
    type: 'Property';
    key: AstExpression;    // since ES2015
    //   AstLiteral | AstIdentifier;
    value: AstExpression;
    kind: 'init' | 'get' | 'set';
    method: boolean;    // since ES2015
    shorthand: boolean;    // since ES2015
    computed: boolean;    // since ES2015
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

export interface AstMemberExpression extends AstExpression, AstPattern, AstChainElement /* inherited since ES2020 */ {
    type: 'MemberExpression';
    object: AstExpression | AstSuper;    // since ES2015
    //      AstExpression;
    property: AstExpression | AstPrivateIdentifier;    // since ES2022
    //        AstExpression;
    computed: boolean;
}

export interface AstConditionalExpression extends AstExpression {
    type: 'ConditionalExpression';
    test: AstExpression;
    alternate: AstExpression;
    consequent: AstExpression;
}

export interface AstCallExpression extends AstExpression, AstChainElement /* inherited since ES2020 */ {
    type: 'CallExpression';
    callee: AstExpression | AstSuper;    // since ES2015
    //      AstExpression;
    arguments: (AstExpression | AstSpreadElement)[];    // since ES2015
    //         AstExpression[];
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

export interface AstPattern extends AstNode {
}

export interface AstForOfStatement extends AstForInStatement {    // since ES2015
    type: 'ForOfStatement';
    await: boolean;    // since ES2018
}

export interface AstSuper extends AstNode {    // since ES2015
    type: 'Super';
}

export interface AstSpreadElement extends AstNode {    // since ES2015
    type: 'SpreadElement';
    argument: AstExpression;
}

export interface AstArrowFunctionExpression extends AstFunction, AstExpression {    // since ES2015
    type: 'ArrowFunctionExpression';
    body: AstFunctionBody | AstExpression;
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

export interface AstAssignmentProperty extends AstProperty {    // since ES2015
    type: 'Property';
    // inherited
    value: AstPattern;
    kind: 'init';
    method: false;
}

export interface AstObjectPattern extends AstPattern {    // since ES2015
    type: 'ObjectPattern';
    properties: (AstAssignmentProperty | AstRestElement)[];    // since ES2018
    //          AstAssignmentProperty[];
}

export interface AstArrayPattern extends AstPattern {    // since ES2015
    type: 'ArrayPattern';
    elements: (AstPattern | null)[];
}

export interface AstRestElement extends AstPattern {    // since ES2015
    type: 'RestElement';
    argument: AstPattern;
}

export interface AstAssignmentPattern extends AstPattern {    // since ES2015
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

export interface AstClassDeclaration extends AstClass, AstDeclaration {    // since ES2015
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

export interface AstImportOrExportDeclaration extends AstNode {    // since ES2015
}

export interface AstModuleSpecifier extends AstNode {    // since ES2015
    local: AstIdentifier;
}

export interface AstImportDeclaration extends AstImportOrExportDeclaration {    // since ES2015
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

export interface AstExportNamedDeclaration extends AstImportOrExportDeclaration {    // since ES2015
    type: 'ExportNamedDeclaration';
    declaration: AstDeclaration | null;
    specifiers: AstExportSpecifier[];
    source: AstLiteral | null;
}

export interface AstExportSpecifier extends AstModuleSpecifier {    // since ES2015
    type: 'ExportSpecifier';
    exported: AstIdentifier | AstLiteral;    // since ES2022
    //        AstIdentifier;
    local: AstIdentifier | AstLiteral;    // since ES2022
}

export interface AstAnonymousDefaultExportedFunctionDeclaration extends AstFunction {    // since ES2015
    type: 'FunctionDeclaration';
    id: null;
}

export interface AstAnonymousDefaultExportedClassDeclaration extends AstClass {    // since ES2015
    type: 'ClassDeclaration';
    id: null;
}

export interface AstExportDefaultDeclaration extends AstImportOrExportDeclaration {    // since ES2015
    type: 'ExportDefaultDeclaration';
    declaration: AstAnonymousDefaultExportedFunctionDeclaration | AstFunctionDeclaration | AstAnonymousDefaultExportedClassDeclaration | AstClassDeclaration | AstExpression;
}

export interface AstExportAllDeclaration extends AstImportOrExportDeclaration {    // since ES2015
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

export interface AstChainExpression extends AstExpression {    // since ES2020
    type: 'ChainExpression';
    expression: AstChainElement;
}

export interface AstChainElement extends AstNode {    // since ES2020
    optional: boolean;
}

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
}

export interface AstStaticBlock extends AstBlockStatement {    // since ES2022
    type: 'StaticBlock';
}

