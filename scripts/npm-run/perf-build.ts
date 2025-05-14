
import { run } from "../scripts-common";
import fs from 'node:fs';

const inputs = [
    'perf/octane/base.js',
    ['perf/octane/splay.js'],
    ['perf/octane/code-load.js'],
    ['perf/octane/richards.js'],
    ['perf/octane/deltablue.js'],
    ['perf/octane/box2d.js'],
    ['perf/octane/raytrace.js'],
    ['perf/octane/navier-stokes.js'],
    ['perf/octane/regexp.js'],
    ['perf/octane/gbemu-part1.js', 'perf/octane/gbemu-part2.js'],
    ['perf/octane/crypto.js'],
    ['perf/octane/earley-boyer.js'],
    ['perf/octane/mandreel.js'],
    ['perf/octane/typescript.js', 'perf/octane/typescript-input.js', 'perf/octane/typescript-compiler.js'],
    // It takes too long: ['perf/octane/zlib.js', 'perf/octane/zlib-data.js'],
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
            let text = fs.readFileSync(file, 'utf-8');
            if (file.endsWith('typescript-compiler.js')) {
                text = text
                    .replace(/(\s*=\s*require\s*\()/g, ' = requir2(')
                    .replace(/typeof\s+require/g, 'typeof requir2')
                    ;
            }
            output += text + '\n';
        }
        output += groupSuffix;
    } else {
        output += fs.readFileSync(input, 'utf-8') + '\n';
    }
}

let template = fs.readFileSync('perf/src/suite.template.js', 'utf-8');
output = template.replace('/***TESTS-GO-HERE***/', output.replace(/\$/g, '$$$$'));

fs.mkdirSync('build/perf', { recursive: true });
fs.writeFileSync('build/perf/suite.js', output, 'utf-8');

run('npx', 'esbuild', '--target=firefox125', '--bundle', '--outfile=build/perf/test.js', '--minify-whitespace', 'perf/src/test.ts');
let source = fs.readFileSync('build/perf/test.js', 'utf-8');
source = `(function(main){if (globalThis.registerMainFunction) globalThis.registerMainFunction(main);else main();})(function(){${source}});`;
fs.writeFileSync('build/perf/test.js', source);
