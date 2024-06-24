
import * as fs from 'node:fs';

const files = [
    'richards.js',
    'deltablue.js',
    'crypto.js',
    'raytrace.js',
    'earley-boyer.js',
    'regexp.js',
    'splay.js',
    'navier-stokes.js',
    'mandreel.js',
    'box2d.js',
    'zlib-data.js',
    'typescript.js',
    'typescript-input.js',
    'typescript-compiler.js',
];

//files.reverse();
files.unshift('base.js')
files.push('run.js');

let out = `

if (typeof print === 'undefined') {
    print = console.log;
}

function load() {}

`+ files
        .map(file => fs.readFileSync(`perf/octane/${file}`, 'utf8'))
        .join('\n//-------------------------------------------------------------------\n');

fs.writeFileSync(`perf/main.js`, out);
