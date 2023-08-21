
import tf = require('@tensorflow/tfjs');
import { Message } from './common';

const LEN = 20;

let model: tf.Sequential;
let userQueue: number[] = [];

function newModel() {
    model = tf.sequential();
    model.add(tf.layers.dense({ units: 10, inputShape: [LEN] }));
    model.add(tf.layers.dense({ units: 5 }));
    model.add(tf.layers.dropout({ rate: 0.1 }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ loss: 'meanSquaredError', optimizer: 'adam', metrics: ['binaryAccuracy'] });
    console.log('Model initialized.');
}

let training = false;
let input: number[] = [];

async function train() {
    let xa: number[][] = [];
    let ya: number[] = [];
    //let wa: number[] = [];
    let firstIndex = input.length - LEN - 1;
    let lastIndex = Math.max(0, input.length - LEN - 1 - 100);
    let middleIndex = Math.max(0, input.length - LEN - 1 - 30);
    let i = firstIndex;
    while (i >= 0 && i >= middleIndex) {
        xa.push(input.slice(i, i + LEN));
        ya.push(input[i + LEN]);
        i--;
    }
    for (let k = 0; k < Math.min(40, middleIndex); k++) {
        let pos = Math.sqrt(Math.random());
        let i = lastIndex + Math.round(pos * (middleIndex - lastIndex));
        xa.push(input.slice(i, i + LEN));
        ya.push(input[i + LEN]);
    }

    //console.log(`                  Training on ${ya.length} inputs`);

    let xt = tf.tensor2d(xa, [ya.length, LEN]);
    let yt = tf.tensor2d(ya, [ya.length, 1]);
    //let wt = tf.tensor2d(wa, [ya.length, 1]);

    await model.fit(xt, yt, {
        epochs: 20,
        //sampleWeight: wt, // sample weight is not supported yet in tf.
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                //console.log(epoch, logs);
            }
        }
    });
    let startIndex = input.length - LEN;
    //console.log(input);
    let y = model.predict(tf.tensor2d(input.slice(startIndex, input.length), [1, LEN]));
    let predicated = Math.round((y as any).arraySync()[0][0]);
    msg({ type: 'prediction', data: predicated });
    //console.log(`                  Done`);
}

async function processQueue() {
    if (training) return;
    while (userQueue.length > 0) {
        let value = userQueue.shift();
        input.push(value);
        if (input.length > LEN + 10) {
            training = true;
            await train();
            training = false;
        } else {
            msg({ type: 'prediction', data: Math.round(Math.random()) });
        }
    }
}

function workerMessage(e) {
    let data = e.data as Message;
    switch (data.type) {
        case 'init':
            newModel();
            msg({ type: 'ready' });
            msg({ type: 'prediction', data: Math.round(Math.random()) });
            break;
        case 'input':
            userQueue.push(data.data);
            processQueue();
            break;
    }
}

function msg(message: Message) {
    postMessage(message);
}

onmessage = workerMessage;
