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

export type AstWithStatementContainers = AstProgram | AstBlockStatement | AstWithStatement | AstLabeledStatement | AstIfStatement | AstSwitchCase | AstWhileStatement | AstDoWhileStatement | AstForStatement | AstForInStatement | AstForOfStatement | AstStaticBlock;
