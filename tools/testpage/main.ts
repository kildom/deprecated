

import * as sandbox from '../../src-host/sandbox';


async function main() {
    let mod = await WebAssembly.compileStreaming(fetch('../../debug/sandbox.wasm'));
    console.log(WebAssembly.Module.imports(mod));
    await sandbox.setSandboxModule(mod);
    let sb = await sandbox.instantiate({maxHeapSize: 16 * 1024 * 1024, maxWasmSize: 32 * 1024 * 1024});

    sb.registerImports({
        log(...args: any[]) { console.log('%cGUEST>', 'color: #008040', ...args); },
    });

    sb.execute(`
        __sandbox__.registerExports({
            log(...args) { __sandbox__.imports.log('LOG OVER GUEST:', ...args); },
        });
        globalThis.console = {
            log(...args) { __sandbox__.imports.log(...args); },
        };
        console.log("Console OK");
    `);

    sb.execute(`
        let s = 2 * 1024 * 1024;
        for (let i = 0; i < 10; i++) {
            //__sandbox__.gc();
            console.log(__sandbox__.memory, __sandbox__.memory.calculateStackUsage());
            let arr = new ArrayBuffer(s);
            arr[s - 1] = 99;
            console.log(Math.ceil(arr.byteLength / 1024 / 1024 * 100) / 100, "MB");
        }
        function f(x) {
            if (x % 100 === 0) {
                console.log(__sandbox__.memory, __sandbox__.memory.calculateStackUsage());
                console.log(x);
            }
            f(x + 1);
        }
        f(0);
        `);

}

setTimeout(main, 300);
