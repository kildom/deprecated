
import * as fs from 'node:fs';

import { setSandboxModule, instantiate } from '../../src-host/sandbox';

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
    let module = await WebAssembly.compile(bin);
    setSandboxModule(module);
    let sandbox = await instantiate({ maxHeapSize: 1024 * 1024 * 1024 });

    let scores: { [key: string]: number } = {};

    globalThis.log = (...args: any[]) => {
        let line = args.map(x => x.toString()).join(' ');
        let m = line.match(/^([a-z0-9\(\) ]+):\s*([0-9]+)/i);
        if (!m) {
            console.log(...args);
            return;
        }
        let name = m[1];
        let score = parseFloat(m[2]);
        if (name in scores) {
            console.log(`${line},`, Math.round(scores[name] / score * 10) / 10, 'times slower');
        } else {
            scores[name] = score;
            console.log(...args);
        }
    };

    sandbox.registerImports({
        log(...args: any[]) {
            globalThis.log(...args);
        },
    });

    let cnt = fs.readFileSync('perf/main.js', 'utf-8');

    console.log('Host performance:');

    let hostPerf = new Function('var print = globalThis.log; ' + cnt);
    hostPerf();

    console.log('\nGuest performance:');

    sandbox.execute('var print = __sandbox__.imports.log;' + cnt);
}

main();
