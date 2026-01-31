import { AstNode } from "./Node";
import { AstIdentifier } from "./Identifier";
import { AstPattern } from "./Pattern";
import { AstBlockStatement } from "./BlockStatement";
import { AstFunctionContainers, AstFunctionComponents } from './helpers/FunctionHelper';
import { collectVariables, findParentScope, Scope, ScopeSymbol } from "../scope";
import { empty } from "../utils";
import { DumpOutput } from "../dump";
import { CompileError } from "../errors";
import { AstDirective } from "./Directive";

export class AstFunction extends AstNode implements Scope {
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es5.md#functions
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2015.md#functions
    // https://github.com/estree/estree/blob/96fee942ecc2b3b9d3c34163ec142b75daf4cca1/es2017.md#function

    declare type: "FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression" | "Program";

    declare id: AstIdentifier | null;
    declare params: AstPattern[];
    declare body: AstBlockStatement;
    declare generator: boolean;
    declare async: boolean;

    declare container: AstFunctionContainers | null;

    declare components: AstFunctionComponents[];

    isStrict: boolean = false;

    variables = empty<Scope['variables']>();
    scopeOptions: Scope['scopeOptions'] = {
        parent: null,
        isWith: false,
        letDeclarations: true,
        varDeclarations: true,
    };
    [ScopeSymbol]: true = true;

    setupPass() {
        if (this.program.sourceType === 'module' || this.func?.isStrict) {
            this.isStrict = true;
        } else {
            this.detectStrict(this.body);
        }
        super.setupPass();
        this.scopeOptions.parent = findParentScope(this);
        if (!this.scopeOptions.parent && this.type !== "Program") {
            throw new CompileError(this, 'Internal error: Parent scope not found.');
        }
    }

    collectVariablesPass() {
        for (let param of this.params) {
            collectVariables(this, param.getPatternLeafs());
        }
        super.collectVariablesPass();
    }

    detectStrict(node: AstNode) {
        if (node instanceof AstFunction) {
            return;
        } else if (node instanceof AstDirective) {
            if (node.directive === 'use strict') {
                this.isStrict = true;
            }
        } else {
            for (let comp of node.components) {
                this.detectStrict(comp);
            }
        }
    }

    dump(out: DumpOutput) {
        super.dump(out);
        out('isStrict', this.isStrict);
        out('variables', this.variables);
        out("scopeOptions", this.scopeOptions, [false, true]);
    }

};

export function isAstFunction(node: any): node is AstFunction {
    return node instanceof AstFunction;
}
