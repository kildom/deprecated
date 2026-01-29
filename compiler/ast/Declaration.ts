import { AstProgram } from "./Program";
import { AstBlockStatement } from "./BlockStatement";
import { AstWithStatement } from "./WithStatement";
import { AstLabeledStatement } from "./LabeledStatement";
import { AstIfStatement } from "./IfStatement";
import { AstSwitchCase } from "./SwitchCase";
import { AstWhileStatement } from "./WhileStatement";
import { AstDoWhileStatement } from "./DoWhileStatement";
import { AstForStatement } from "./ForStatement";
import { AstForInStatement } from "./ForInStatement";
import { AstForOfStatement } from "./ForOfStatement";
import { AstExportNamedDeclaration } from "./ExportNamedDeclaration";
import { AstExportDefaultDeclaration } from "./ExportDefaultDeclaration";
import { AstStaticBlock } from "./StaticBlock";
import { AstIdentifier } from "./Identifier";
import { AstPattern } from "./Pattern";
import { AstVariableDeclarator } from "./VariableDeclarator";
import { AstExpression } from "./Expression";
import { AstClassBody } from "./ClassBody";
import { AstFunctionDeclaration } from "./FunctionDeclaration";
import { AstVariableDeclaration } from "./VariableDeclaration";
import { AstClassDeclaration } from "./ClassDeclaration";

export interface AstDeclarationIntf {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#declarations


    container: AstProgram | AstBlockStatement | AstWithStatement | AstLabeledStatement | AstIfStatement | AstSwitchCase | AstWhileStatement | AstDoWhileStatement | AstForStatement | AstForInStatement | AstForOfStatement | AstExportNamedDeclaration | AstExportDefaultDeclaration | AstStaticBlock;

    components: (AstIdentifier | AstPattern | AstBlockStatement | AstVariableDeclarator | AstExpression | AstClassBody)[];

    [AstDeclarationSymbol]: true;
};

export type AstDeclaration =
    | AstFunctionDeclaration
    | AstVariableDeclaration
    | AstClassDeclaration

export function isAstDeclaration(node: any): node is AstDeclarationIntf {
    return node[AstDeclarationSymbol] === true;
}

export const AstDeclarationSymbol = Symbol('AstDeclaration');
