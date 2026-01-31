import * as util from 'node:util';
import chalk from 'chalk';

import { AstNode } from "./ast/Node";
import { AstProgram } from "./ast/Program";

const INDENT = '  ';

export type DumpOutput = (name: string, value: any, asLink?: boolean | boolean[], std?: boolean) => void;


export class Dump {

    nextObjectId = 1;

    linkedNodes = new Set<AstNode>();
    dumpedNodes = new Set<AstNode>();
    linkedObjects = new Set<any>();
    dumpedObjects = new Set<any>();
    objectIds = new Map<any, number>();
    skipStd: boolean = true;

    constructor(
        public programs: AstProgram[]
    ) {
    }

    dump() {

        for (let program of this.programs) {
            program.dump((name: string, value: any, asLink: boolean | boolean[] = true, std = false) => {
                if (!std || !this.skipStd) {
                    this.print(name, value, asLink, '');
                }
            });
        }

    }

    print(name: string, value: any, asLinkArr: boolean | boolean[], indent: string) {
        let asLink: boolean;
        let asLinkNext: boolean | boolean[];
        if (typeof asLinkArr === 'boolean') {
            asLink = asLinkArr;
            asLinkNext = asLink;
        } else {
            asLink = asLinkArr[0];
            if (asLinkArr.length > 1) {
                asLinkNext = asLinkArr.slice(1);
            } else {
                asLinkNext = asLink;
            }
        }
        if (typeof (value) !== 'object' || value === null || value instanceof RegExp) {
            let text = '';
            if (typeof (value) === 'string' && value.match(/^[ -\x7F]+$/)) {
                text = chalk.green(value);
            }
            if (text === '') {
                text = util.inspect(value, { showHidden: false, depth: null, colors: true });
            }
            console.log(`${indent}${chalk.gray(name)}: ${text}`);
        } else if (Array.isArray(value)) {
            if (value.length === 0) {
                console.log(`${indent}${chalk.gray(name)}: []`);
            } else {
                console.log(`${indent}${chalk.gray(name)}:`);
                for (let i = 0; i < value.length; i++) {
                    this.print(`[${i}]`, value[i], asLinkNext, indent + INDENT);
                }
            }
        } else if (value instanceof AstNode) {
            if (asLink || this.dumpedNodes.has(value)) {
                this.linkedNodes.add(value);
                console.log(`${indent}${chalk.gray(name)}: ${value.type}::${value.uid}`);
            } else {
                this.dumpedNodes.add(value);
                console.log(`${indent}${chalk.gray(name)}: ${value.type}::${chalk.blue(value.uid)}`);
                value.dump((subName: string, subValue: any, subAsLink: boolean | boolean[] = true, subStd: boolean = false) => {
                    if (!subStd || !this.skipStd) {
                        this.print(subName, subValue, subAsLink, indent + INDENT);
                    }
                });
            }
        } else {
            let id: number;
            if (this.objectIds.has(value)) {
                id = this.objectIds.get(value)!;
            } else {
                id = this.nextObjectId++;
                this.objectIds.set(value, id);
            }
            if (asLink || this.dumpedObjects.has(value)) {
                this.linkedObjects.add(value);
                console.log(`${indent}${chalk.gray(name)}: @${id}`);
            } else {
                this.dumpedObjects.add(value);
                console.log(`${indent}${chalk.gray(name)}: @${id}`);
                for (let name in value) {
                    this.print(`[${name}]`, value[name], asLinkNext, indent + INDENT);
                }
            }
        }
    }

};
