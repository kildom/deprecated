import { AstFunction } from "../Function";
import { AstCatchClause } from "../CatchClause";
import { AstForInStatement } from "../ForInStatement";
import { AstFunctionDeclaration } from "../FunctionDeclaration";
import { AstVariableDeclarator } from "../VariableDeclarator";
import { AstFunctionExpression } from "../FunctionExpression";
import { AstAssignmentExpression } from "../AssignmentExpression";
import { AstForOfStatement } from "../ForOfStatement";
import { AstArrowFunctionExpression } from "../ArrowFunctionExpression";
import { AstAssignmentProperty } from "../AssignmentProperty";
import { AstArrayPattern } from "../ArrayPattern";
import { AstRestElement } from "../RestElement";
import { AstAssignmentPattern } from "../AssignmentPattern";
import { AstAnonymousDefaultExportedFunctionDeclaration } from "../AnonymousDefaultExportedFunctionDeclaration";

export type AstAssignmentPatternContainers = AstFunction | AstCatchClause | AstForInStatement | AstFunctionDeclaration | AstVariableDeclarator | AstFunctionExpression | AstAssignmentExpression | AstForOfStatement | AstArrowFunctionExpression | AstAssignmentProperty | AstArrayPattern | AstRestElement | AstAssignmentPattern | AstAnonymousDefaultExportedFunctionDeclaration;
