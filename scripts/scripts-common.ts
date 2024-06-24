
import * as child_process from 'node:child_process';

export function run(...args: string[]) {
    let out = child_process.spawnSync(args[0], args.slice(1), {
        stdio: 'inherit',
    });
    if (out.status !== 0) throw Error(`"${args[0]}" command failed: ${out.status}`);
}

