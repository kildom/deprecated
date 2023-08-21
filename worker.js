
import {sequential} from 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest';

console.log(sequential);

let model;

function newModel() {
    model = tf.sequential();
    model.add(tf.layers.dense({ units: 10, inputShape: [LEN] }));
    model.add(tf.layers.dense({ units: 5 }));
    model.add(tf.layers.dropout({ rate: 0.1 }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ loss: 'meanSquaredError', optimizer: 'adam', metrics: ['binaryAccuracy'] });
    console.log('Model initialized.');
}

function workerMessage(e) {
    let data = e.data;
    switch (data.type) {
        case 'init':
            newModel();
            msg({type: 'ready'});
            break;
        case 'input':
            break;
    }
}

function msg(message) {
    postMessage(message);
}

onmessage = workerMessage;
