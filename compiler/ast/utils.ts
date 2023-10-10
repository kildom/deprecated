import { Application } from "../Application";
import { AstCallExpression } from "./CallExpression";
import { AstChainExpression } from "./ChainExpression";
import { AstExportNamedDeclaration, AstExportSpecifier } from "./ExportNamedDeclaration";
import { AstExpressionStatement } from "./ExpressionStatement";
import { AstFunction } from "./Function";
import { AstFunctionBase } from "./FunctionBase";
import { AstIdentifier } from "./Identifier";
import { AstLiteral } from "./Literal";
import { AstMemberExpression } from "./MemberExpression";
import { AstNode } from "./Node";
import { AstAssignmentProperty, AstObjectPattern } from "./ObjectPattern";
import { AstProgram } from "./Program";
import { AstProperty } from "./Property";
import { AstSpreadElement } from "./SpreadElement";
import { AstSuper } from "./Super";
import { AstVariableDeclaration, AstVariableDeclarator } from "./VariableDeclaration";
import { AstWithStatement } from "./WithStatement";


let nextUid = 100000;


const classList: { [key: string]: Function } = {
    CallExpression: AstCallExpression,
    ChainExpression: AstChainExpression,
    ExpressionStatement: AstExpressionStatement,
    Function: AstFunction,
    FunctionBase: AstFunctionBase,
    Identifier: AstIdentifier,
    Literal: AstLiteral,
    MemberExpression: AstMemberExpression,
    Node: AstNode,
    Program: AstProgram,
    SpreadElement: AstSpreadElement,
    Super: AstSuper,
    VariableDeclaration: AstVariableDeclaration,
    VariableDeclarator: AstVariableDeclarator,
    WithStatement: AstWithStatement,
    ExportNamedDeclaration: AstExportNamedDeclaration,
    ExportSpecifier: AstExportSpecifier,
    ObjectPattern: AstObjectPattern,
    Property: AstProperty,
    AssignmentProperty: AstAssignmentProperty,
};


export function convertNode(node: any, app: Application): acorn.Node {
    if (node.type in classList) {
        let proto = new (classList[node.type] as any)();
        Object.setPrototypeOf(node, proto);
        node.app = app;
        node.uid = nextUid++;
        let initList: any[] = [];
        for (let p = node; p; p = Object.getPrototypeOf(p)) {
            if (Object.getOwnPropertyNames(p).indexOf('initialize') >= 0) {
                initList.unshift(p.initialize);
            }
        }
        for (let init of initList) {
            init.call(node);
        }
    }
    return node;
}

