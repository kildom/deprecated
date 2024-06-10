
import * as fs from 'node:fs';

import { setSandboxModule, instantiate } from './sandbox';


async function main() {

    let fileName: string;

    do {
        fileName = './release/sandbox.opt.wasm';
        if (fs.existsSync(fileName)) break;
        fileName = './quickbuild/sandbox.wasm';
        if (fs.existsSync(fileName)) break;
        fileName = './debug/sandbox.wasm';
        if (fs.existsSync(fileName)) break;
    } while (false);

    let bin = fs.readFileSync(fileName);
    let t = Date.now();
    let module = await WebAssembly.compile(bin);
    console.log(Date.now() - t);
    console.log(module);
    setSandboxModule(module);

    let sandbox = await instantiate();

    console.log(sandbox.execute(`
        function a() { return 99; };
        a();
        "test();"
    `, { fileName: 'source1.js', returnValue: true, asModule: true }));

    console.log(sandbox.execute(`
        a();
    `, { fileName: 'source2.js', returnValue: true, asModule: true }));

}

main();
