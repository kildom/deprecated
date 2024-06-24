
import * as fs from 'node:fs';
import { run } from "../scripts-common";

run('npx', 'tsc', '-b', 'src-host/tsconfig.esm.json');
run('npx', 'tsc', '-b', 'src-host/tsconfig.cjs.json');
run('npx', 'tsc', '-b', 'src-host/tsconfig.browser.json');


function buildBrowserEntry(name: string, variable: string, addMapFile: boolean = true) {
    run('npx', 'esbuild',
        '--bundle',
        ...(addMapFile ? ['--sourcemap'] : []),
        '--format=iife',
        '--target=es2020',
        `--global-name=${variable}`,
        `--outfile=dist/browser/${name}.js`,
        `build/browser/src-host/${name}.js`);
    let main = fs.readFileSync('dist/esm/src-host/sandbox.d.ts', 'utf8');
    let def = fs.readFileSync(`src-host/browser/${name}.d.ts`, 'utf8');
    fs.writeFileSync(`dist/browser/${name}.d.ts`, main + '\n' + def);
}

buildBrowserEntry('sandbox', 'sandbox');
buildBrowserEntry('bundle-release', 'sandboxExtensionBundleRelease', false);
buildBrowserEntry('bundle-size', 'sandboxExtensionBundleSize', false);
