
import * as fs from 'fs';
import * as acorn from 'acorn';


class Node {
    constructor(

        public start: number,
        public end: number

    ) { };
};

class Program extends Node {
    constructor(

        public type: "Program",
        public body: Statement[]

    ) { // @ts-ignore
        super();
    };
};

class Statement extends Node {
};

class EmptyStatement extends Statement {
    constructor(

        public type: "EmptyStatement"

    ) { // @ts-ignore
        super();
    };
};

class BlockStatement extends Statement {
    constructor(

        public type: "BlockStatement",
        public body: Statement[]

    ) { // @ts-ignore
        super();
    };
};

class Expression extends Node {
};

class ExpressionStatement extends Statement {
    constructor(

        public type: "ExpressionStatement",
        public expression: Expression

    ) { // @ts-ignore
        super();
    };
};

class Literal extends Expression {
    constructor(

        public type: 'Literal',
        public value: string | boolean | null | number | RegExp

    ) { // @ts-ignore
        super();
    };
}

interface Pattern { }

class Identifier extends Expression implements Pattern {
    constructor(

        public type: "Identifier",
        public name: string

    ) { // @ts-ignore
        super();
    };
}

class Declaration extends Statement {
}

interface FunctionInterface {
    id: Identifier | null;
    params: Pattern[];
    body: FunctionBody;
    func: Func;
}

class Func {
    public constructor(
        public id: Identifier | null,
        public params: Pattern[],
        public body: FunctionBody,
        public node: FunctionDeclaration | FunctionExpression
    ) { }
}

class FunctionBody extends BlockStatement {
    constructor(

        public body: Statement[]

    ) { // @ts-ignore
        super();
    };
}

class FunctionDeclaration extends Declaration implements FunctionInterface {
    constructor(

        public type: "FunctionDeclaration",
        public id: Identifier,
        public params: Pattern[],
        public body: FunctionBody,
        public func: Func

    ) { // @ts-ignore
        super();
    };

    public reconstruct() {
        this.func = new Func(this.id, this.params, this.body, this);
    }
}


class FunctionExpression extends Expression implements FunctionInterface {
    constructor(

        public type: "FunctionExpression",
        public id: Identifier | null,
        public params: Pattern[],
        public body: FunctionBody,
        public func: Func

    ) { // @ts-ignore
        super();
    };

    public reconstruct() {
        this.func = new Func(this.id, this.params, this.body, this);
    }
}


class ForStatement extends Statement {
    constructor(
        public type: "ForStatement",
        public init: VariableDeclaration | Expression | null,
        public test: Expression | null,
        public update: Expression | null,
        public body: Statement,
    ) { // @ts-ignore
        super();
    };
}


class VariableDeclarator extends Node {
    constructor(

        public type: "VariableDeclarator",
        public id: Pattern,
        public init: Expression | null,

        public parent: VariableDeclaration,
        public kind: "var" | "let" | "const",
        public scope: BlockStatement | Func | ForStatement

    ) { // @ts-ignore
        super();
    };

    public reconstruct() {
        this.kind = this.parent.kind;
    }
}


class VariableDeclaration extends Declaration {
    constructor(

        public type: "VariableDeclaration",
        public declarations: VariableDeclarator[],
        public kind: "var" | "let" | "const",    // since ES2015
        //           "var",

    ) { // @ts-ignore
        super();
    };
}

const classes = [
    Program,
    EmptyStatement,
    BlockStatement,
    Literal,
    ExpressionStatement,
    FunctionDeclaration,
    VariableDeclaration,
    VariableDeclarator,
];

const typeToClass = Object.fromEntries(classes.map(cls => [cls.name, cls]));
let captureList: [any, any][] = [];

function enrichValue(raw: { [key: string]: any }, parent?: any, params?: { [key: string]: any }): any {
    params = params || {};
    if (typeof raw !== 'object') {
        return raw;
    } else if (raw instanceof Array) {
        return raw.map(x => enrichValue(x, parent, params));
    } else {
        let Cls: any = typeToClass[raw.type];
        if (!Cls) {
            return raw;
        } else {
            let obj = new Cls();
            captureList.push([obj, raw]);
            for (let key in params) {
                obj[key] = params[key];
            }
            for (let key in raw) {
                let value = raw[key];
                obj[key] = enrichValue(value, obj, params);
            }
            obj.parent = parent;
            if (obj.reconstruct) {
                obj.reconstruct(raw);
            }
            return obj;
        }
    }
}

let js = fs.readFileSync('test-input.js', 'utf-8');

let rawTree = acorn.parse(js, {
    ecmaVersion: 6,
    sourceType: 'module',
    allowAwaitOutsideFunction: true,
});

fs.writeFileSync('test-input.syntax.json', JSON.stringify(rawTree, null, 4));

let tree = enrichValue(rawTree) as Program;

console.log(tree);
