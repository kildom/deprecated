
import { run } from "../scripts-common";
import * as fs from "node:fs";


function buildGuestPackage(name: string) {
    run('npx', 'esbuild', '--target=firefox125', '--bundle', `--outfile=build/guest-raw/${name}.js`, `src-guest/${name}/${name}.ts`);
    let source = fs.readFileSync(`build/guest-raw/${name}.js`, 'utf8');
    fs.mkdirSync('build/guest', { recursive: true });
    fs.writeFileSync(`build/guest/${name}.ts`, `const source: string = ${JSON.stringify(source)};\nexport default source;\n`, 'utf-8');
}

buildGuestPackage('boot');
