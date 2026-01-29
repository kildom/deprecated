import { AstBlockStatement } from "./BlockStatement";
import { AstStatement } from "./Statement";
import { AstStaticBlockContainers } from './helpers/StaticBlockHelper';

export class AstStaticBlock extends AstBlockStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2022.md#staticblock

    declare type: "StaticBlock";

    declare body: AstStatement[];

    declare container: AstStaticBlockContainers;

    declare components: (AstStatement)[];


};

export function isAstStaticBlock(node: any): node is AstStaticBlock {
    return node instanceof AstStaticBlock;
}
