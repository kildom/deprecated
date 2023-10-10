

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
