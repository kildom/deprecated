import * as fs from "fs";

let prependedScript = `

function require(name) {
    if (name != 'fs') return;
    return {
        existsSync(name) {
            return name == "./release/sandbox.opt.wasm";
        },
        readFileSync(name, enc) {
            switch (name) {
                case './release/sandbox.opt.wasm':
                    return new Uint8Array(wasmFile);
                case 'perf/main.js':
                    return perfFile;
                default:
                    console.error(name, enc);
                    break;
            }
        }
    };
};

if (typeof SharedArrayBuffer === "undefined") globalThis.SharedArrayBuffer = ArrayBuffer;
if (typeof process === "undefined") {
    globalThis.process = {
        argv: ['a', 'b'],
    };
}

`.replace(/[\r\n]/g, ' ');

prependedScript += ` const wasmFile = ${JSON.stringify([...fs.readFileSync('release/sandbox.opt.wasm')])}; `;
prependedScript += ` const perfFile = ${JSON.stringify(fs.readFileSync('perf/main.js', 'utf-8'))}; `;

let cnt = fs.readFileSync('perf/src/run.js', 'utf8');

if (cnt.startsWith(prependedScript)) {
    process.exit(0);
}

fs.writeFileSync('perf/src/run.js', prependedScript + cnt);
