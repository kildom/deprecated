
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
    let scoresText: string[] = [];

    globalThis.log = (...args: any[]) => {
        let line = args.map(x => x.toString()).join(' ');
        let m = line.match(/^([a-z0-9\(\) ]+):\s*([0-9]+)/i);
        if (!m) {
            scoresText.push(line);
            console.log(...args);
            return;
        }
        let name = m[1];
        let score = parseFloat(m[2]);
        if (name in scores) {
            let out = [`${line},`, Math.round(scores[name] / score * 10) / 10, 'times slower'];
            scoresText.push(out.join(' '));
            console.log(...out);
        } else {
            scores[name] = score;
            scoresText.push(line);
            console.log(...args);
        }
    };

    sandbox.registerImports({
        log(...args: any[]) {
            globalThis.log(...args);
        },
    });

    let cnt = fs.readFileSync('perf/main.js', 'utf-8');

    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
        window.alert('The test starts. It may take some time.');
    }

    scoresText.push('Host performance:');
    console.log('Host performance:');

    let hostPerf = new Function('var print = globalThis.log; const window = undefined; ' + cnt);
    hostPerf();

    scoresText.push('\nGuest performance:');
    console.log('\nGuest performance:');

    sandbox.execute('var print = __sandbox__.imports.log;' + cnt);

    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
        let pre = window.document.createElement('pre');
        pre.innerHTML = scoresText.join('\n');
        window.document.body.appendChild(pre);
    }
}

main();
