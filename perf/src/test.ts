import * as sandbox from '../../src-host/sandbox';
import moduleSource from '../../src-host/bundle-release';
import perfCode from '../../build/perf/bundle';
import '../../build/perf/main.js';

let results: { [key: string]: [number, number] } = {};


async function runSandboxedBenchmark() {
    await sandbox.setModule(moduleSource);
    let sb = await sandbox.instantiate({
        maxWasmSize: 1024 * 1024 * 1024,
    });
    sb.imports({
        NotifyResult: function (name, result) {
            results[name][0] = result;
            console.log(name + ': ' + result + ' / ' + results[name][1] + '  =>  ' + (results[name][1] / results[name][0]).toFixed(1) + ' times');
        },
        NotifyError: function (name, error) {
            results[name][0] = -1;
            console.error(name + ': ' + error);
        },
        NotifyScore: function (result) {
            let name = 'total';
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
    sb.execute(perfCode, { fileName: 'build/perf/main.js' });
    sb.exports.start(0);
}

function runNativeBenchmark() {
    return new Promise<void>((resolve) => {
        function NotifyResult(name, result) {
            results[name] = [0, result];
            console.log(name + ': ' + result);
        };
        function NotifyError(name, error) {
            results[name] = [0, -1];
            console.error(name + ': ' + error);
        };
        function NotifyScore(score) {
            results['total'] = [0, score];
            console.log('----');
            console.log('Score: ' + score);
            resolve();
        };
        globalThis.RunAllSuites(NotifyResult, NotifyError, NotifyScore);
    });
}

async function main() {
    console.log('Running native benchmark...');
    await runNativeBenchmark();
    console.log('Running sandboxed benchmark...');
    await runSandboxedBenchmark();
    for (let [name, scores] of Object.entries(results)) {
        console.log(name + ': ' + scores[0] + ' / ' + scores[1] + '  =>  ' + (scores[1] / scores[0]).toFixed(1) + ' times');
    }
}

main();

