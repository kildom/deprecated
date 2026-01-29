import { AstArrayExpression } from "../ArrayExpression";
import { AstObjectExpression } from "../ObjectExpression";
import { AstCallExpression } from "../CallExpression";
import { AstNewExpression } from "../NewExpression";

export type AstSpreadElementContainers = AstArrayExpression | AstObjectExpression | AstCallExpression | AstNewExpression;
