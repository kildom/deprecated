
import fs from 'node:fs';

const inputs = [
    'perf/octane/base.js',
    ['perf/octane/splay.js'],
    //['perf/octane/zlib.js', 'perf/octane/zlib-data.js'],
    ['perf/octane/code-load.js'],
    ['perf/octane/richards.js'],
    ['perf/octane/deltablue.js'],
    ['perf/octane/crypto.js'],
    ['perf/octane/raytrace.js'],
    ['perf/octane/earley-boyer.js'],
    ['perf/octane/regexp.js'],
    ['perf/octane/navier-stokes.js'],
    ['perf/octane/mandreel.js'],
    ['perf/octane/gbemu-part1.js', 'perf/octane/gbemu-part2.js'],
    ['perf/octane/box2d.js'],
    ['perf/octane/typescript.js', 'perf/octane/typescript-input.js', 'perf/octane/typescript-compiler.js'],
    'perf/src/run.js',
];

const groupPrefix = `
    ;(function(){
        if (typeof MockElement !== 'undefined') {
            globalThis.MockElement = MockElement;
        }
    `;

const groupSuffix = `
    })();
    `;

let output = '';

for (let input of inputs) {
    if (Array.isArray(input)) {
        output += groupPrefix;
        for (let file of input) {
            output += fs.readFileSync(file, 'utf-8') + '\n';
        }
        output += groupSuffix;
    } else {
        output += fs.readFileSync(input, 'utf-8') + '\n';
    }
}

fs.mkdirSync('build/perf', { recursive: true });
fs.writeFileSync('build/perf/main.js', output, 'utf-8');
fs.writeFileSync('build/perf/bundle.ts', `const data = ${JSON.stringify(output)}; export default data;`, 'utf-8');
