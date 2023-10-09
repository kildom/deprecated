
import * as util from 'node:util';
import * as acorn from 'acorn';
import * as fs from 'node:fs';
import { ECMA_VERSION_NUMBER } from './constants';
import { AstProgram } from './ast/Program';
import { AstExpressionStatement } from './ast/ExpressionStatement';
import { AstCallExpression } from './ast/CallExpression';
import { AstMemberExpression } from './ast/MemberExpression';
import { AstIdentifier } from './ast/Identifier';
import { AstLiteral } from './ast/Literal';
import { BytecodeGenerator } from './BytecodeGenerator';
import { AstChainExpression } from './ast/ChainExpression';

const classList: { [key: string]: Function } = {
    Program: AstProgram,
    ExpressionStatement: AstExpressionStatement,
    CallExpression: AstCallExpression,
    MemberExpression: AstMemberExpression,
    Identifier: AstIdentifier,
    Literal: AstLiteral,
    ChainExpression: AstChainExpression,
};

function convertNode(node: any): acorn.Node {
    if (node.type in classList) {
        let proto = new (classList[node.type] as any)();
        Object.setPrototypeOf(node, proto);
        let initList: any[] = [];
        for (let p = node; p; p = Object.getPrototypeOf(p)) {
            if (p.initialize) {
                initList.unshift(p.initialize);
            }
        }
        for (let init of initList) {
            init.call(node);
        }
    }
    return node;
}

function parse(code: string) {
    let parser = new acorn.Parser({
        ecmaVersion: ECMA_VERSION_NUMBER,
        sourceType: "module",
        allowAwaitOutsideFunction: true,
        allowHashBang: true,
    }, code);

    let oldFinishNode = parser.finishNode;
    let oldFinishNodeAt = parser.finishNodeAt;

    parser.finishNode = (...args: any[]) => {
        return convertNode(oldFinishNode.apply(parser, args as any));
    }
    parser.finishNodeAt = (...args: any[]) => {
        return convertNode(oldFinishNodeAt.apply(parser, args as any));
    }

    return parser.parse() as AstProgram;
}

let program = parse(fs.readFileSync('../tmp/test.js', 'utf-8'));

console.log(util.inspect(program, {showHidden: false, depth: null, colors: true}));

let gen = new BytecodeGenerator();
program.generate(gen);
