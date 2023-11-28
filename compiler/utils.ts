import { AstNode } from "./ast/Node";
import { AstFunctionBase } from "./ast/Function";
import { Variable, VariablesContainer } from "./Namespace";
import { AstMemberExpression } from "./ast/MemberExpression";
import { AstIdentifier } from "./ast/Identifier";
import { CompileError } from "./Errors";


export function isStrict(node: AstNode): boolean {
    return !!node.walkParents(p => {
        if (p instanceof AstFunctionBase) {
            return p.strict;
        }
    });
}

export function collectVariables(parent: VariablesContainer, ids: (AstMemberExpression | AstIdentifier)[]) {
    let usedNames = new Set<string>();
    for (let id of ids) {
        if (id instanceof AstMemberExpression) {
            throw new CompileError(id, 'Member expression is not allowed here.');
        }
        if (usedNames.has(id.name)) {
            throw new CompileError(id, 'Identifier already declared.');
        }
        usedNames.add(id.name);
        parent.variables.push(new Variable(id.name));
    };
}
