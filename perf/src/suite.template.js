
globalThis.RunAllSuites = function (NotifyResult, NotifyError, NotifyScore) {

    // The following comment will be replaced by the 'npm run pref-build' command.
    // It will contain Octane 2.0 performance tests.

    /***TESTS-GO-HERE***/

    if (typeof globalThis.read === 'undefined') {
        globalThis.read = () => { throw new Error('read is not defined'); };
    }

    if (typeof globalThis.print === 'undefined') {
        globalThis.print = () => { throw new Error('read is not defined'); };
    }

    if (typeof NotifyResult === 'undefined') {
        NotifyResult = function (name, result) {
            console.log(name + ': ' + result);
        }
    }

    if (typeof NotifyError === 'undefined') {
        NotifyError = function (name, error) {
            console.error(name + ': ' + error);
        }
    }

    if (typeof NotifyScore === 'undefined') {
        NotifyScore = function (score) {
            console.log('----');
            console.log('Score: ' + score);
        }
    }

    BenchmarkSuite.config.doWarmup = undefined;
    BenchmarkSuite.config.doDeterministic = undefined;
    BenchmarkSuite.RunSuites({
        NotifyResult,
        NotifyError,
        NotifyScore,
    });

};
