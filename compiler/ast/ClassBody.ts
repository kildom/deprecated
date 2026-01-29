import { AstNode } from "./Node";
import { AstMethodDefinition } from "./MethodDefinition";
import { AstPropertyDefinition } from "./PropertyDefinition";
import { AstStaticBlock } from "./StaticBlock";
import { AstClassBodyContainers } from './helpers/ClassBodyHelper';

export class AstClassBody extends AstNode {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#classbody
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#classbody

    declare type: "ClassBody";

    declare body: (AstMethodDefinition | AstPropertyDefinition | AstStaticBlock)[];

    declare container: AstClassBodyContainers;

    declare components: (AstMethodDefinition | AstPropertyDefinition | AstStaticBlock)[];


};

export function isAstClassBody(node: any): node is AstClassBody {
    return node instanceof AstClassBody;
}
