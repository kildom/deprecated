
let worker;

function workerMessage(e) {
    let data = e.data;
    switch (data.type) {
        case 'ready':
            console.log('Worker ready.');
            break;
        case 'prediction':
            break;
    }
}

function msg(data) {
    worker.postMessage(data);
}

window.__my__load = function(text) {
    worker = new Worker(text, {type: 'module'});
    worker.onmessage = workerMessage;
    worker.onerror = (...e) => console.log(...e);
    msg({type: 'init'});
}
