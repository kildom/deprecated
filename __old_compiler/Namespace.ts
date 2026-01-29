

export type VariableLocation =
  'globalStack'         // Variables that are in block that doesn't have await or yield, are not used in inner function
  | 'localStack'        // Variables that must be preserved during await or yield.
  | 'globalStackScope'  // Like 'globalStack', but variables are used in inner function.
  | 'localStackScope'   // Like 'localStack', but variables are used in inner function.
  | 'outerScope'        // Variables from outer function.
  | 'parameter'         // Simple function parameter (not deconstructed, not in async function, not used in inner function)
  | 'global'            // Variable from global scope.
  ;

export class Variable {
    used: boolean = false;
    usedInInner: boolean = false;
    type?: VariableLocation;
    index?: number; // absolute stack index of the variable or the micro scope, or global head index (including prefix)
    microScopeIndex?: number; // index in micro scope if variable is used by inner function
    constructor(
        public name: string
    ) {}
};


export interface VariablesContainer {
  variables: Variable[];
}
