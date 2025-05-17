import * as sandbox from '../../src-host/sandbox';
import bundleRelease from '../../src-host/bundle-release';
import bundleSize from '../../src-host/bundle-size';
import '../../build/perf/suite.js';

let results: { [key: string]: { native: number, release: number, size: number } } = {};

type EnvType = 'native' | 'release' | 'size';
type NotificationType = 'result' | 'error' | 'info' | 'done';


function notify(type: NotificationType, envType: EnvType, name: string, value: any) {
    if (typeof globalThis.WorkerGlobalScope !== 'undefined' && self instanceof globalThis.WorkerGlobalScope) {
        self.postMessage({ type, envType, name, value });
    }
}

async function runSandboxedBenchmark(envType: EnvType) {
    await sandbox.setModule(envType === 'release' ? bundleRelease : bundleSize);
    let sb = await sandbox.instantiate({
        maxWasmSize: 200 * 1024 * 1024,
        minHeapThreshold: 70 * 1024 * 1024,
        maxHeapSize: 100 * 1024 * 1024,
    });
    sb.imports({
        NotifyResult: function (name, result) {
            notify('result', envType, name, result);
            results[name] = results[name] ?? { native: 0, release: 0, size: 0 };
            results[name][envType] = result;
            console.log(name + ': ' + result + ' / ' + results[name][1] + '  =>  ' + (results[name][envType] / results[name]['native']).toFixed(1) + ' times');
            let t = Date.now();
            console.log(name + ': ' + result, '         ', t - time);
            time = t;
            let mem = sb.execute('__sandbox__.memory', { returnValue: true });
            for (let name in mem) {
                mem[name] = (mem[name] / 1024 / 1024).toFixed(3) + ' MB';
            }
            console.log("MEM:", JSON.stringify(mem, null, 2));
        },
        NotifyError: function (name, error) {
            notify('error', envType, name, error);
            results[name] = results[name] ?? { native: 0, release: 0, size: 0 };
            results[name][envType] = -1;
            console.error(name + ': ' + error);
        },
        NotifyScore: function (result) {
            let name = 'total';
            notify('result', envType, name, result);
            results[name] = results[name] ?? { native: 0, release: 0, size: 0 };
            results[name][envType] = result;
            console.log(name + ': ' + result + ' / ' + results[name][1] + '  =>  ' + (results[name][envType] / results[name]['native']).toFixed(1) + ' times');
            console.log('Score: ' + result);
        },
    }, 0);
    sb.execute(`
        __sandbox__.exports({
            start: function() {
                globalThis.RunAllSuites(
                    (...a) => { __sandbox__.memory.gc(); return __sandbox__.imports.NotifyResult(...a); },
                    (...a) => { __sandbox__.memory.gc(); return __sandbox__.imports.NotifyError(...a); },
                    (...a) => { __sandbox__.memory.gc(); return __sandbox__.imports.NotifyScore(...a); },
                );
            }
        }, 0);
        `, { fileName: 'loader.js' });
    sb.execute('globalThis.RunAllSuites = (' + globalThis.RunAllSuites.toString() + ');', { fileName: 'build/perf/main.js' });
    sb.execute('__sandbox__.memory.gc()');
    let mem = sb.execute('__sandbox__.memory', { returnValue: true });
    for (let name in mem) {
        mem[name] = (mem[name] / 1024 / 1024).toFixed(3) + ' MB';
    }
    console.log("MEM on start:", JSON.stringify(mem, null, 2));
    sb.exports.start(0);
}

let time = Date.now();

function runNativeBenchmark() {
    return new Promise<void>((resolve) => {
        function NotifyResult(name, result) {
            notify('result', 'native', name, result);
            results[name] = { native: result, release: 0, size: 0 };
            let t = Date.now();
            console.log(name + ': ' + result, '         ', t - time);
            time = t;
        };
        function NotifyError(name, error) {
            notify('error', 'native', name, error);
            results[name] = { native: -1, release: 0, size: 0 };
            console.error(name + ': ' + error);
        };
        function NotifyScore(score) {
            notify('result', 'native', 'total', score);
            results['total'] = { native: score, release: 0, size: 0 };
            console.log('----');
            console.log('Score: ' + score);
            resolve();
        };
        globalThis.RunAllSuites(NotifyResult, NotifyError, NotifyScore);
    });
}

function info(text: string) {
    notify('info', 'native', 'info', text);
    console.log(text);
}

async function main() {
    try {
        if (!globalThis.filterEnvType || globalThis.filterEnvType === 'native') {
            info('Running native benchmark...');
            await runNativeBenchmark();
        }
        if (!globalThis.filterEnvType || globalThis.filterEnvType === 'release') {
            info('Running sandboxed benchmark (release)...');
            await runSandboxedBenchmark('release');
        }
        if (!globalThis.filterEnvType || globalThis.filterEnvType === 'size') {
            info('Running sandboxed benchmark (size)...');
            await runSandboxedBenchmark('size');
        }
        if (!globalThis.filterEnvType) {
            for (let [name, scores] of Object.entries(results)) {
                console.log(`${name}:\n`
                    + `    release ${scores.release} => ${(scores.release / scores.native * 100).toFixed(2)}%\n`
                    + `    size    ${scores.size} => ${(scores.size / scores.native * 100).toFixed(2)}%`);
            }
        }
        info('Done.');
    } catch (e) {
        notify('error', 'native', 'total', e);
        info('Done with error.');
        throw e;
    } finally {
        notify('done', 'native', '', 0);
    }
}

main();

