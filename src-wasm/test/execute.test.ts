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
import { ExecuteFlags, LogLevel, Wrapper, CompileResult, GuestError } from '../wrapper/wrapper';


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
    await wrapper.init(16 * 1024 * 1024, 24 * 1024 * 1024, 32 * 1024 * 1024, LogLevel.Info);
    return wrapper;
}

test.for(fileVariants)(`compile [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    using res = wrapper.compile("'OK'", "some_file.js", ExecuteFlags.ReturnValue);
    expect(res).instanceOf(CompileResult);
    expect(res.ptr).toBeGreaterThan(0);
    expect(() => {
        using res = wrapper.compile("'not OK'-", "some_file.js", ExecuteFlags.ReturnValue);
    }).toThrow();
});

test.for(fileVariants)(`execute [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        using bytecode = wrapper.compile(escapedTextString, "testFile1.js", ExecuteFlags.ReturnValue);
        let res = wrapper.execute(bytecode, null);
        expect(res).toBe(testString);
    }
    {
        using bytecode = wrapper.compile(`tmp = ${escapedTextString}`, "testFile2.js", 0);
        let res = wrapper.execute(bytecode, null);
        expect(res).toBeUndefined();
    }
    {
        using bytecode = wrapper.compile('tmp', "testFile3.js", ExecuteFlags.ReturnValue);
        let res = wrapper.execute(bytecode, null);
        expect(res).toBe(testString);
    }
    {
        using bytecode = wrapper.compile('({ text: "abc", number: 42 })', "testFile4.js", ExecuteFlags.ReturnValue);
        let res = wrapper.execute(bytecode, null);
        expect(res).toBe('[object Object]');
    }
    {
        using bytecode = wrapper.compile('throw new Error("Test error");', "testFile5.js", ExecuteFlags.ReturnValue);
        try {
            wrapper.execute(bytecode, null);
            throw new Error("Should not reach here");
        } catch (e) {
            expect(e).toBeInstanceOf(GuestError);
            expect(e.message).toBe("Test error");
        }
    }
    {
        using bytecode = wrapper.compile('Object.create(null)', "testFile6.js", ExecuteFlags.ReturnValue);
        try {
            wrapper.execute(bytecode, null);
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
        using bytecode = wrapper.compile('__sandbox__.arg', "testFile1.js", ExecuteFlags.ReturnValue);
        let res = wrapper.execute(bytecode, testString);
        expect(res).toBe(testString);
    }
    {
        using bytecode = wrapper.compile('__sandbox__._onDataFromHost = JSON.parse;', "testFile2.js", 0);
        wrapper.execute(bytecode, testString);
    }
    {
        using bytecode = wrapper.compile('__sandbox__.arg.text + __sandbox__.arg.number', "testFile3.js", ExecuteFlags.ReturnValue);
        let testObj = { text: testString, number: 42 };
        let res = wrapper.execute(bytecode, JSON.stringify(testObj));
        expect(res).toBe(testObj.text + testObj.number);
    }
});

test.for(fileVariants)(`execute with result [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        using bytecode = wrapper.compile('__sandbox__._onDataToHost = JSON.stringify;__sandbox__._onDataFromHost = JSON.parse;', "testFile1.js", 0);
        wrapper.execute(bytecode);
    }
    {
        using bytecode = wrapper.compile('__sandbox__.arg', "testFile1.js", ExecuteFlags.ReturnValue);
        let testObj = { text: testString, number: 42 };
        let res = wrapper.execute(bytecode, JSON.stringify(testObj));
        expect(JSON.parse(res!)).toStrictEqual(testObj);
    }
});

test.for(fileVariants)(`call from host [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    {
        using bytecode = wrapper.compile(`
            __sandbox__._onDataToHost = JSON.stringify;
            __sandbox__._onDataFromHost = JSON.parse;
            __sandbox__._call = function (groupId, functionId, arg) {
                return { groupId: groupId, functionId: functionId, ...arg };
            };
            `, "testFile1.js", ExecuteFlags.Once);
        wrapper.execute(bytecode);
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
        using bytecode = wrapper.compile(`
            __sandbox__.call(44, 66, ${escapedTextString})
            `, "testFile1.js", ExecuteFlags.ReturnValue | ExecuteFlags.Once);
        let res = wrapper.execute(bytecode, testString);
        expect(res).toBe(testString + '4466');
    }
});


test.for(fileVariants)(`call from guest with filter [%s]`, async (moduleFile) => {
    let wrapper = await prepareWrapper(moduleFile);
    wrapper.onCall = (groupId, functionId, arg) => {
        return JSON.stringify({ groupId, functionId, ...JSON.parse(arg ?? 'null') });
    };
    {
        using bytecode = wrapper.compile(`
            __sandbox__._onDataToHost = JSON.stringify;
            __sandbox__._onDataFromHost = JSON.parse;
            __sandbox__.call(44, 66, { text: ${escapedTextString}, number: 42 })
            `, "testFile1.js", ExecuteFlags.ReturnValue | ExecuteFlags.Once);
        let res = wrapper.execute(bytecode, testString);
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
        using bytecode = wrapper.compile(`x = ${escapedTextString};`, "testFile1.js", ExecuteFlags.Once);
        wrapper.execute(bytecode);
    }

    let snapshot = wrapper.takeSnapshot();

    let wrapper2 = await Wrapper.fromSnapshot(snapshot);
    {
        using bytecode = wrapper2.compile('old = x; x = "changed"; old', "testFile1.js", ExecuteFlags.Once | ExecuteFlags.ReturnValue);
        let res = wrapper2.execute(bytecode);
        expect(res).toBe(testString);
    }

    let wrapper3 = await Wrapper.fromSnapshot(snapshot);
    {
        using bytecode = wrapper3.compile('x', "testFile1.js", ExecuteFlags.Once | ExecuteFlags.ReturnValue);
        let res = wrapper3.execute(bytecode);
        expect(res).toBe(testString);
    }
});
