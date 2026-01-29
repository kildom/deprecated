import { AstClass } from "../Class";
import { AstClassDeclaration } from "../ClassDeclaration";
import { AstClassExpression } from "../ClassExpression";
import { AstAnonymousDefaultExportedClassDeclaration } from "../AnonymousDefaultExportedClassDeclaration";

export type AstClassBodyContainers = AstClass | AstClassDeclaration | AstClassExpression | AstAnonymousDefaultExportedClassDeclaration;
