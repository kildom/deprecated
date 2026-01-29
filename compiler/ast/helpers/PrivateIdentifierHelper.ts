import { AstBinaryExpression } from "../BinaryExpression";
import { AstMemberExpression } from "../MemberExpression";
import { AstMethodDefinition } from "../MethodDefinition";
import { AstPropertyDefinition } from "../PropertyDefinition";

export type AstPrivateIdentifierContainers = AstBinaryExpression | AstMemberExpression | AstMethodDefinition | AstPropertyDefinition;
