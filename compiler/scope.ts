import { AstIdentifier } from "./ast/Identifier";
import { AstMemberExpression } from "./ast/MemberExpression";
import { AstNode } from "./ast/Node";
import { Variable } from "./variable";


export interface Scope extends AstNode {
    /** Variables declared in this scope. */
    variables: { [name: string]: Variable };
    /** Defined how this scope behaves. */
    scopeOptions: {
        /** Parent scope or null for global scope (may be in other function). */
        parent: Scope | null;
        /** This is special `with` scope. It contains one variable with spacial name, e.g. `%with{uid}`
         * that represents object used in `with` block. It is a variable that will be used to resolve
         * names from `with` block.
         */
        isWith: boolean;
        /** This scope can hold `let`, `const` and `using` variables. */
        letDeclarations: boolean;
        /** This scope can hold `var` variables. */
        varDeclarations: boolean;
    };
    [ScopeSymbol]: true;
}

export const ScopeSymbol = Symbol('Scope');

export function isScope(obj: any): obj is Scope {
    return obj && obj[ScopeSymbol] === true;
}

export function findParentScope(base: AstNode): Scope | null {
    let parent = base.container;
    while (parent) {
        if (isScope(parent)) {
            return parent;
        }
        parent = parent.container;
    }
    return null;
}

export function collectVariables(parent: Scope, ids: (AstMemberExpression | AstIdentifier)[]) {
    let usedNames = new Set<string>();
    for (let id of ids) {
        if (id instanceof AstMemberExpression) {
            parent.app.error(id, 'Member expression is not allowed here.');
            continue;
        }
        if (usedNames.has(id.name)) {
            parent.app.error(id, 'Identifier already declared.');
            continue;
        }
        usedNames.add(id.name);
        parent.variables.push(new Variable(id.name));
    };
}
