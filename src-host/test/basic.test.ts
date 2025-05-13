/*
 * Copyright 2025 Dominik Kilian
 *
 * Redistribution and use in source and binary forms,  with or without modification, are permitted provided
 * that the following conditions are met:
 * 1. Redistributions  of source code must retain  the above copyright notice,  this list of conditions and
 *    the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 *    the following disclaimer in the documentation  and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED  BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING,  BUT NOT LIMITED TO,  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT,  INDIRECT,  INCIDENTAL,  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL DAMAGES (INCLUDING,  BUT NOT
 * LIMITED TO,  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;  LOSS OF USE,  DATA,  OR PROFITS;  OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,  WHETHER IN CONTRACT,  STRICT LIABILITY, OR
 * TORT  (INCLUDING NEGLIGENCE OR OTHERWISE)  ARISING IN ANY WAY OUT  OF THE USE OF THIS SOFTWARE,  EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


import fs from 'node:fs';
import { expect, test, vi, beforeEach } from 'vitest';


beforeEach(() => {
    vi.resetModules()
});

const fileVariants = [
    'debug.wasm',
    'release.wasm',
    'size.wasm',
];

const modulePerVariant: { [key: string]: typeof import('../sandbox') } = {};

async function getModule(wasmFile: string): Promise<typeof import('../sandbox')> {
    if (!modulePerVariant[wasmFile]) {
        modulePerVariant[wasmFile] = await import('../sandbox');
        await modulePerVariant[wasmFile].setModule(fs.readFileSync(`dist/${wasmFile}`));
    }
    return modulePerVariant[wasmFile];
}


test.for(fileVariants)(`execute [%s]`, async (wasmFile) => {
    let mod = await getModule(wasmFile);
    let sandbox = await mod.instantiate();
    expect(sandbox).toBeDefined();
    let res = sandbox.execute('1 + 2', { returnValue: true });
    expect(res).toBe(3);
});

test.for(fileVariants)(`compile [%s]`, async (wasmFile) => {
    let mod = await getModule(wasmFile);
    let sandbox = await mod.instantiate();
    sandbox.execute('x = 1;');
    using code = sandbox.compile('x++', { returnValue: true });
    expect(sandbox.execute(code)).toBe(1);
    expect(sandbox.execute(code)).toBe(2);
    expect(sandbox.execute(code)).toBe(3);
    expect(sandbox.execute(code)).toBe(4);
});

test.for(fileVariants)(`call default import [%s]`, async (wasmFile) => {
    let mod = await getModule(wasmFile);
    let sandbox = await mod.instantiate();
    let calls: string[] = [];
    sandbox.imports({
        test: (a: string) => {
            calls.push(a);
            return a + '-test';
        },
    }, 0);
    let res = sandbox.execute(`__sandbox__.imports.test('one')`, { returnValue: true });
    expect(res).toBe('one-test');
    expect(calls).toStrictEqual(['one']);
    res = sandbox.execute(`__sandbox__.imports.test(2)`, { returnValue: true });
    expect(res).toBe('2-test');
    expect(calls).toStrictEqual(['one', 2]);
});

test.for(fileVariants)(`call import [%s]`, async (wasmFile) => {
    let mod = await getModule(wasmFile);
    let sandbox = await mod.instantiate();
    let calls: string[] = [];
    let id = sandbox.imports({
        test: (a: string) => {
            calls.push(a);
            return a + '-test';
        },
    });
    let res = sandbox.execute(`__sandbox__.imports(${id}).test('one')`, { returnValue: true });
    expect(res).toBe('one-test');
    expect(calls).toStrictEqual(['one']);
    res = sandbox.execute(`__sandbox__.imports(${id}).test(2)`, { returnValue: true });
    expect(res).toBe('2-test');
    expect(calls).toStrictEqual(['one', 2]);
});

test.for(fileVariants)(`call export [%s]`, async (wasmFile) => {
    let mod = await getModule(wasmFile);
    let sandbox = await mod.instantiate();
    sandbox.execute(`
        calls = [];
        __sandbox__.exports({
            test: (a) => {
                calls.push(a);
                return a + '-test';
            },
        }, 0);`, {fileName: 'test.js'});
    let res = sandbox.exports.test('one');
    expect(res).toBe('one-test');
    res = sandbox.exports.test(2);
    expect(res).toBe('2-test');
    let calls = sandbox.execute('calls', { returnValue: true });
    expect(calls).toStrictEqual(['one', 2]);
});

test.for(fileVariants)(`snapshot [%s]`, async (wasmFile) => {
    let mod = await getModule(wasmFile);
    let sandbox = await mod.instantiate();
    sandbox.execute(`x = 1;`);
    let snapshot = sandbox.takeSnapshot();
    expect(snapshot).toBeDefined();
    let inc = sandbox.execute(`++x`, { returnValue: true });
    expect(inc).toBe(2);
    let sandbox2 = await snapshot.instantiate();
    inc = sandbox2.execute(`++x`, { returnValue: true });
    expect(inc).toBe(2);
});

