import { AstProgram } from "../Program";
import { AstBlockStatement } from "../BlockStatement";
import { AstWithStatement } from "../WithStatement";
import { AstLabeledStatement } from "../LabeledStatement";
import { AstIfStatement } from "../IfStatement";
import { AstSwitchCase } from "../SwitchCase";
import { AstWhileStatement } from "../WhileStatement";
import { AstDoWhileStatement } from "../DoWhileStatement";
import { AstForStatement } from "../ForStatement";
import { AstForInStatement } from "../ForInStatement";
import { AstForOfStatement } from "../ForOfStatement";
import { AstStaticBlock } from "../StaticBlock";
import { AstVariableDeclaration } from "../VariableDeclaration";
import { AstPattern } from "../Pattern";
import { AstExpression } from "../Expression";
import { AstStatement } from "../Statement";

export type AstForInStatementContainers = AstProgram | AstBlockStatement | AstWithStatement | AstLabeledStatement | AstIfStatement | AstSwitchCase | AstWhileStatement | AstDoWhileStatement | AstForStatement | AstForInStatement | AstForOfStatement | AstStaticBlock;

export type AstForInStatementComponents = AstVariableDeclaration | AstPattern | AstExpression | AstStatement;
