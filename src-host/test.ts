
import * as fs from 'node:fs';

import { setSandboxModule, instantiate } from './sandbox';


async function main() {

    let fileName: string;

    do {
        fileName = './release/sandbox-final.wasm';
        if (fs.existsSync(fileName)) break;
        fileName = './release/sandbox.opt.wasm';
        if (fs.existsSync(fileName)) break;
        fileName = './quickbuild/sandbox.wasm';
        if (fs.existsSync(fileName)) break;
        fileName = './debug/sandbox.wasm';
        if (fs.existsSync(fileName)) break;
    } while (false);

    let bin = fs.readFileSync(fileName);
    let t = Date.now();
    //let module = await WebAssembly.compile(bin);
    //console.log(Date.now() - t);
    //console.log(module);
    await setSandboxModule(bin,{
        //allowFreeze: true,
    });

    let sandbox = await instantiate({maxHeapSize: 32 * 1024 * 1024, maxWasmSize: 32 * 1024 * 1024});
    /*
        if(0)try {
            console.log(sandbox.execute(`
            
                function f() {
                    let x = abs;
                }
                f();
    
            `, { fileName: 'source1.js', returnValue: true, asModule: true }));
        } catch (error) {
            console.log(error);
        }
    
        let ar = [1,2, 3];
        ar[10000] = 99;
        ar[-1] = 88;
    
        let x = new Uint8Array([3,4,5,34,23,4,3,5,34,5,3,45,2,3,2,4,2,34]);
        let a = new Uint32Array(x.buffer, 4, 3);
        console.log(a);
    
        console.log(sandbox.execute(`
            \`\${__sandbox__.imports.log}\`
        `, { fileName: 'source1.js', returnValue: true, asModule: true }));
    */
    sandbox.registerImports({
        log(...args: any[]) { console.log('LOG OVER INTERFACE:', ...args); },
    });

    sandbox.execute(`
        __sandbox__.registerExports({
            log(...args) { __sandbox__.imports.log('LOG OVER GUEST:', ...args); },
        });
        globalThis.console = {
            log(...args) { __sandbox__.imports.log(...args); },
        }
    `);

    sandbox.execute(`
        //let str = "let x = new Uint8Array([3,4,5,34,23,4,3,5,34,5,3,45,2,3,2,4,2,34])dfdfsdfsdfsdff";
        let s = 16 * 1024 * 1024;
        while (true) {
            //str += str + String.fromCharCode(Math.round(Math.random() * 100));
            //str = str.substr(1, str.length);
            //console.log(Math.ceil(str.length / 1024 / 1024 * 100) / 100, "MB");
            //s *= 2;
            __sandbox__.gc();
            let arr = new ArrayBuffer(s);
            //arr[s - 1] = 99;
            console.log(Math.ceil(arr.byteLength / 1024 / 1024 * 100) / 100, "MB");
        }
        `);

    //sandbox.exports.log("To jest test.");

    /*let cnt = fs.readFileSync('perf/main.js', 'utf-8');

    sandbox.execute(`
        var print = __sandbox__.imports.log;
    `+ cnt, { fileName: 'perf/main.js', asModule: false });*/
}

main();

console.log("To jest test.");