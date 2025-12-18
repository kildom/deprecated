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
import { expect, test, vi } from 'vitest';
import { ExecuteFlags, LogLevel, Wrapper, GuestError } from '../wrapper/wrapper';


const fileVariants = [
    'debug.wasm',
    'release.wasm',
    'size.wasm',
];

const testString = "Hello, world! Witaj świecie!";
const escapedTextString = JSON.stringify(testString);

const modules = Object.fromEntries(fileVariants.map(file => [file, WebAssembly.compile(fs.readFileSync(`dist/${file}`))]));


async function prepareWrapper(moduleFile: string) {
    let module = await modules[moduleFile];
    let wrapper = new Wrapper(module);
    await wrapper.init(64 * 1024 * 1024, 96 * 1024 * 1024, 128 * 1024 * 1024, LogLevel.Info);
    return wrapper;
}

test.for(fileVariants)(`execute [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        let res = wrapper.execute(escapedTextString, "testFile1.js", ExecuteFlags.ReturnValue, null);
        expect(res).toBe(testString);
    }
    {
        let res = wrapper.execute(`tmp = ${escapedTextString}`, "testFile2.js", 0, null);
        expect(res).toBeUndefined();
    }
    {
        let res = wrapper.execute('tmp', "testFile3.js", ExecuteFlags.ReturnValue, null);
        expect(res).toBe(testString);
    }
    {
        let res = wrapper.execute('({ text: "abc", number: 42 })', "testFile4.js", ExecuteFlags.ReturnValue, null);
        expect(res).toBe('[object Object]');
    }
    {
        try {
            wrapper.execute('throw new Error("Test error");', "testFile5.js", ExecuteFlags.ReturnValue, null);
            throw new Error("Should not reach here");
        } catch (e) {
            expect(e).toBeInstanceOf(GuestError);
            expect(e.message).toBe("Test error");
        }
    }
    {
        try {
            wrapper.execute('Object.create(null)', "testFile6.js", ExecuteFlags.ReturnValue, null);
            throw new Error("Should not reach here");
        } catch (e) {
            expect(e).toBeInstanceOf(GuestError);
            expect(e.message).toContain("string");
        }
    }
});

test.for(fileVariants)(`execute with arg [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        let res = wrapper.execute('__sandbox__.arg', "testFile1.js", ExecuteFlags.ReturnValue, testString);
        expect(res).toBe(testString);
    }
    {
        wrapper.execute('__sandbox__._onDataFromHost = JSON.parse;', "testFile2.js", 0, testString);
    }
    {
        let testObj = { text: testString, number: 42 };
        let res = wrapper.execute('__sandbox__.arg.text + __sandbox__.arg.number', "testFile3.js", ExecuteFlags.ReturnValue, JSON.stringify(testObj));
        expect(res).toBe(testObj.text + testObj.number);
    }
});

test.for(fileVariants)(`execute with result [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        wrapper.execute('__sandbox__._onDataToHost = JSON.stringify;__sandbox__._onDataFromHost = JSON.parse;', "testFile1.js", 0);
    }
    {
        let testObj = { text: testString, number: 42 };
        let res = wrapper.execute('__sandbox__.arg', "testFile1.js", ExecuteFlags.ReturnValue, JSON.stringify(testObj));
        expect(JSON.parse(res!)).toStrictEqual(testObj);
    }
});

test.for(fileVariants)(`call from host [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        wrapper.execute(`
            __sandbox__._onDataToHost = JSON.stringify;
            __sandbox__._onDataFromHost = JSON.parse;
            __sandbox__._call = function (groupId, functionId, arg) {
                return { groupId: groupId, functionId: functionId, ...arg };
            };
            `, "testFile1.js", 0);
    }
    let testObj = { text: testString, number: 42 };
    let res = wrapper.call(22, 33, JSON.stringify(testObj));
    expect(JSON.parse(res!)).toStrictEqual({ groupId: 22, functionId: 33, ...testObj });
});


test.for(fileVariants)(`call from guest [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    wrapper.onCall = (groupId, functionId, arg) => {
        return (arg ?? '') + groupId + functionId;
    };
    {
        let res = wrapper.execute(`
            __sandbox__.call(44, 66, ${escapedTextString})
            `, "testFile1.js", ExecuteFlags.ReturnValue, testString);
        expect(res).toBe(testString + '4466');
    }
});


test.for(fileVariants)(`call from guest with filter [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    wrapper.onCall = (groupId, functionId, arg) => {
        return JSON.stringify({ groupId, functionId, ...JSON.parse(arg ?? 'null') });
    };
    {
        let res = wrapper.execute(`
            __sandbox__._onDataToHost = JSON.stringify;
            __sandbox__._onDataFromHost = JSON.parse;
            __sandbox__.call(44, 66, { text: ${escapedTextString}, number: 42 })
            `, "testFile1.js", ExecuteFlags.ReturnValue, testString);
        expect(JSON.parse(res!)).toStrictEqual({
            groupId: 44,
            functionId: 66,
            text: testString,
            number: 42
        });
    }
});

test.for(fileVariants)(`snapshot [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        wrapper.execute(`x = ${escapedTextString};`, "testFile1.js", 0);
    }

    let snapshot = wrapper.takeSnapshot();

    let wrapper2 = await Wrapper.fromSnapshot(snapshot);
    {
        let res = wrapper2.execute('old = x; x = "changed"; old', "testFile1.js", ExecuteFlags.ReturnValue);
        expect(res).toBe(testString);
    }

    let wrapper3 = await Wrapper.fromSnapshot(snapshot);
    {
        let res = wrapper3.execute('x', "testFile1.js", ExecuteFlags.ReturnValue);
        expect(res).toBe(testString);
    }
});

test.for(fileVariants)(`memory tracking Uint8Array [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    let memText = wrapper.execute(`JSON.stringify(__sandbox__.memory)`, "testFile2.js", ExecuteFlags.ReturnValue);
    let mem = JSON.parse(memText!);
    expect(mem.heapReserved).toBeLessThan(32 * 1024 * 1024);
    expect(mem.heapUsed).toBeLessThan(32 * 1024 * 1024);
    wrapper.execute(`globalThis.arr = new Uint8Array(32 * 1024 * 1024)`, "testFile1.js", 0);
    memText = wrapper.execute(`JSON.stringify(__sandbox__.memory)`, "testFile2.js", ExecuteFlags.ReturnValue);
    mem = JSON.parse(memText!);
    expect(mem.heapReserved).toBeGreaterThan(32 * 1024 * 1024);
    expect(mem.heapUsed).toBeGreaterThan(32 * 1024 * 1024);
});

test.for(fileVariants)(`memory tracking API [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    let memText = wrapper.execute(`JSON.stringify(__sandbox__.memory)`, "testFile2.js", ExecuteFlags.ReturnValue);
    let mem = JSON.parse(memText!);
    expect(mem.heapReserved).toBeLessThan(32 * 1024 * 1024);
    expect(mem.heapUsed).toBeLessThan(32 * 1024 * 1024);
    let ptr = wrapper._exports.create(0, 32 * 1024 * 1024);
    expect(ptr).toBeGreaterThan(0);
    memText = wrapper.execute(`JSON.stringify(__sandbox__.memory)`, "testFile2.js", ExecuteFlags.ReturnValue);
    mem = JSON.parse(memText!);
    expect(mem.heapReserved).toBeGreaterThan(32 * 1024 * 1024);
    expect(mem.heapUsed).toBeGreaterThan(32 * 1024 * 1024);
});
