import * as sandbox from '../../src-host/sandbox';
import moduleSource from '../../src-host/bundle-release';
import '../../build/perf/suite.js';

let results: { [key: string]: [number, number] } = {};


function notify(type: 'result' | 'error' | 'info' | 'done', sandboxed: boolean, name: string, value: any) {
    if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
        self.postMessage({type, sandboxed, name, value});
    }
}

async function runSandboxedBenchmark() {
    await sandbox.setModule(moduleSource);
    let sb = await sandbox.instantiate({
        maxWasmSize: 1024 * 1024 * 1024,
    });
    sb.imports({
        NotifyResult: function (name, result) {
            notify('result', true, name, result);
            results[name][0] = result;
            console.log(name + ': ' + result + ' / ' + results[name][1] + '  =>  ' + (results[name][1] / results[name][0]).toFixed(1) + ' times');
        },
        NotifyError: function (name, error) {
            notify('error', true, name, error);
            results[name][0] = -1;
            console.error(name + ': ' + error);
        },
        NotifyScore: function (result) {
            let name = 'total';
            notify('result', true, name, result);
            results[name][0] = result;
            console.log(name + ': ' + result + ' / ' + results[name][1] + '  =>  ' + (results[name][1] / results[name][0]).toFixed(1) + ' times');
            console.log('Score: ' + result);
        },
    }, 0);
    sb.execute(`
        __sandbox__.exports({
            start: function() {
                globalThis.RunAllSuites(
                    __sandbox__.imports.NotifyResult,
                    __sandbox__.imports.NotifyError,
                    __sandbox__.imports.NotifyScore
                );
            }
        }, 0);
        `, { fileName: 'loader.js' });
    sb.execute('globalThis.RunAllSuites = (' + globalThis.RunAllSuites.toString() + ');', { fileName: 'build/perf/main.js' });
    sb.exports.start(0);
}

function runNativeBenchmark() {
    return new Promise<void>((resolve) => {
        function NotifyResult(name, result) {
            notify('result', false, name, result);
            results[name] = [0, result];
            console.log(name + ': ' + result);
        };
        function NotifyError(name, error) {
            notify('error', false, name, error);
            results[name] = [0, -1];
            console.error(name + ': ' + error);
        };
        function NotifyScore(score) {
            notify('result', false, 'total', score);
            results['total'] = [0, score];
            console.log('----');
            console.log('Score: ' + score);
            resolve();
        };
        globalThis.RunAllSuites(NotifyResult, NotifyError, NotifyScore);
    });
}

function info(text: string) {
    notify('info', false, 'info', text);
    console.log(text);
}

async function main() {
    try {
        info('Running native benchmark...');
        await runNativeBenchmark();
        info('Running sandboxed benchmark...');
        await runSandboxedBenchmark();
        for (let [name, scores] of Object.entries(results)) {
            console.log(name + ': ' + scores[0] + ' / ' + scores[1] + '  =>  ' + (scores[1] / scores[0]).toFixed(1) + ' times');
        }
        info('Done.');
    } catch (e) {
        notify('error', false, 'total', e);
        info('Done with error.');
        throw e;
    } finally {
        notify('done', false, '', 0);
    }
}

main();

