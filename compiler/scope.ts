import { Variable } from "./variable";


export interface Scope {
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
