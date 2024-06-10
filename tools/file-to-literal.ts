
import * as fs from 'node:fs';
import * as path from 'node:path';

let output: string | undefined = undefined;

for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-o' || process.argv[i] === '--output') {
        output = process.argv[i + 1];
        break;
    }
}

for (let file of process.argv.slice(2)) {
    console.log(file);
    let text = fs.readFileSync(file, 'utf-8');
    let ext = path.extname(file);
    let out = path.basename(file);
    out = out.substring(0, out.length - ext.length);
    out = `${path.dirname(file)}/../src-host/src-guest-${out}.ts`;
    fs.writeFileSync(out, `const text = ${JSON.stringify(text)};\nexport default text;\n`, 'utf-8');
}
