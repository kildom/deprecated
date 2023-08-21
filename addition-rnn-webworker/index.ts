import * as tfvis from '@tensorflow/tfjs-vis';
import { Message } from './common';

let userQueue: number[] = [];
let aiQueue: number[] = [];
let hitCount: number = 0;
let missCount: number = 0;

function processQueues() {
    while (userQueue.length > 0 && aiQueue.length > 0) {
        let user = userQueue.shift();
        let ai = aiQueue.shift();
        if (user == ai) {
            missCount++;
        } else {
            hitCount++;
        }
        if (missCount == 25) {
            console.error("You lost!");
            hitCount = 0;
            missCount = 0;
        } else if (hitCount == 25) {
            console.warn("You win!");
            hitCount = 0;
            missCount = 0;
        } else {
            console.log(`${hitCount} vs ${missCount}`);
        }
    }
}

function workerMessage(e) {
    let data = e.data as Message;
    switch (data.type) {
        case 'ready':
            console.log('Worker ready.');
            break;
        case 'prediction':
            //console.log(`Prediction ${data.data}`);
            aiQueue.push(data.data);
            processQueues();
            break;
    }
}

function msg(data: Message) {
    worker.postMessage(data);
}

export function userInput(data: number) {
    userQueue.push(data);
    msg({ type: 'input', data: data });
    processQueues();
}

(window as any).userInput = userInput;

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
worker.onmessage = workerMessage;
msg({ type: 'init' });
//let test = '01001010110101001001001010101001010010010101010010101001001010100101001010101010100101010100101010101011110101101'.split('').forEach(x => userInput(parseInt(x)));

