import { interfaces } from "./structure";

let fixups: {
    interfaces: string[];
    merge: { [key: string]: string };
    remove: { [key: string]: string };
    conditional: { [key: string]: string };
} = {
    "interfaces": [
        "Expression",
        "ChainElement",
        "Declaration"
    ],
    "merge": {
        "BigIntLiteral": "Literal",
        "RegExpLiteral": "Literal"
    },
    "remove": {
        "FunctionBody": "BlockStatement",
        "SourceLocation": "",
        "Position": ""
    },
    "conditional": {
        "Directive": "node.directive",
        "AnonymousDefaultExportedFunctionDeclaration": "node.id === null",
        "AnonymousDefaultExportedClassDeclaration": "node.id === null",
        "AssignmentProperty": "field === 'ObjectPattern.properties'"
    }
};


export function applyFixups() {
    for (let intfName of fixups.interfaces) {
        interfaces[intfName].kind = 'interface';
    }
    for (let [from, to] of Object.entries(fixups.merge)) {
        let source = interfaces[from];
        let target = interfaces[to];
        target.extend([], source.fields);
        interfaces[from] = target;
    }
    for (let [from, to] of Object.entries(fixups.remove)) {
        if (to) {
            interfaces[from] = interfaces[to];
        } else {
            delete interfaces[from];
        }
    }
    for (let [intfName, condition] of Object.entries(fixups.conditional)) {
        let intf = interfaces[intfName];
        intf.condition = condition;
    }
    interfaces['Node'].fields = {};
}
