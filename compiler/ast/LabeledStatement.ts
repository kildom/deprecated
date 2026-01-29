import { AstStatement } from "./Statement";
import { AstIdentifier } from "./Identifier";
import { AstLabeledStatementContainers } from './helpers/LabeledStatementHelper';

export class AstLabeledStatement extends AstStatement {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#labeledstatement

    declare type: "LabeledStatement";

    declare label: AstIdentifier;
    declare body: AstStatement;

    declare container: AstLabeledStatementContainers;

    declare components: (AstIdentifier | AstStatement)[];


};

export function isAstLabeledStatement(node: any): node is AstLabeledStatement {
    return node instanceof AstLabeledStatement;
}
