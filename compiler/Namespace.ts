

export class Variable {
    used: boolean = false;
    usedInInner: boolean = false;
    type?: 'stack' | 'stackScope' | 'outerScope' | 'parameter' | 'global';
    index?: number; // absolute stack index of the variable or the micro scope, or global head index (including prefix)
    microScopeIndex?: number; // index in micro scope if variable is used by inner function
    constructor(
        public name: string
    ) {}
};


export interface VariablesContainer {
  variables: Variable[];
}

/*

Sources of variables:
    - var/let/const: AstVariableDeclarator
      destructuring var/let/const: AstVariableDeclarator + AstPattern
      function/class declaration
        - 'stackScope' - declared here, but used also in inner function
        - 'outerScope' - declared in parent function
        - 'stack' - otherwise
    - function parameters: AstFunctionBase
      destructuring function parameters: AstFunctionBase + AstPattern
        - 'stackScope' - declared here, but used also in inner function
        - 'outerScope' - declared in parent function
        - 'stack' - rest parameter, async/generator function parameter
        - 'parameter' - otherwise
    - imports - TODO
    - globals
        - 'global'

*/