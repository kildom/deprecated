
import * as tf from '@tensorflow/tfjs';
import * as fs from 'node:fs';
import * as chartistSvg from 'chartist-svg';


const LEN = 20;
let model: tf.Sequential;

function newModel() {
    model = tf.sequential();
    model.add(tf.layers.dense({ units: 10, inputShape: [LEN] }));
    model.add(tf.layers.dense({ units: 5 }));
    model.add(tf.layers.dropout({ rate: 0.1 }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ loss: 'meanSquaredError', optimizer: 'adam', metrics: ['binaryAccuracy'] });
}

newModel();

let plotData: number[][] = [[], [], [], []];

async function train() {

    let trainInput = input;

    if (trainInput.length < 20) return;

    let xa: number[][] = [];
    let ya: number[] = [];
    //let wa: number[] = [];
    let firstIndex = trainInput.length - LEN - 1;
    let lastIndex = Math.max(0, trainInput.length - LEN - 1 - 100);
    let middleIndex = Math.max(0, trainInput.length - LEN - 1 - 30);
    let i = firstIndex;
    while (i >= 0 && i >= middleIndex) {
        //console.log(`${i} / ${trainInput.length - 1}`);
        xa.push(trainInput.slice(i, i + LEN));
        ya.push(trainInput[i + LEN]);
        i--;
    }
    for (let k = 0; k < Math.min(40, middleIndex); k++) {
        let pos = Math.sqrt(Math.random());
        let i = lastIndex + Math.round(pos * (middleIndex - lastIndex));
        //console.log(`${i} / ${trainInput.length - 1}`);
        xa.push(trainInput.slice(i, i + LEN));
        ya.push(trainInput[i + LEN]);
    }
    /*while (i >= 0) {
        let d = (firstIndex - i) / 2;
        let weight = (-2.503 * Math.log(Math.max(1, d)) + 10.158) / 3;
        for (let k = 0; k < Math.round(Math.max(1, weight)); k++) {
            xa.push(trainInput.slice(i, i + 2 * LEN));
            ya.push(trainInput[i + 2 * LEN]);
        }
        //wa.push(weight)
        if (weight < 1) {
            let diff = 1 + (1 - weight) * 10;
            //console.log(weight, diff);
            i -= Math.round(diff);
        }
        i--;
    }*/

    console.log(`                  Training on ${ya.length} inputs`);

    let xt = tf.tensor2d(xa, [ya.length, LEN]);
    let yt = tf.tensor2d(ya, [ya.length, 1]);
    //let wt = tf.tensor2d(wa, [ya.length, 1]);

    if (ya.length > 20) {
        await model.fit(xt, yt, {
            epochs: 20,
            //sampleWeight: wt, // sample weight is not supported yet in tf.
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    plotData[0].push(logs.loss);
                    plotData[1].push(logs.binaryAccuracy);
                    //console.log(epoch, logs);
                }
            }
        });
        let startIndex = trainInput.length - LEN;
        let y = model.predict(tf.tensor2d(trainInput.slice(startIndex, trainInput.length), [1, LEN]));
        predicated = Math.round((y as any).arraySync()[0][0]);
    } else {
        predicated = null;
    }

    while (plotData[0].length > 400) {
        plotData[0].shift();
        plotData[1].shift();
    }

    while (plotData[2].length > 400) {
        plotData[2].shift();
        plotData[3].shift();
    }

    let plot = await chartistSvg('line',
        {
            labels: ['loss', 'binaryAccuracy'],
            series: plotData
        },
        {
            options: {
                high: 1,
                low: 0,
            }
        });
    fs.writeFileSync('plot.svg', plot
        .replace(/xmlns="http:\/\/www\.w3\.org\/2000\/xmlns\/"/g, '')
        .replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" '));
    console.log(`                  Done`);
}

let input = [];
let predicated = null;
let training: boolean = false;

let userQueue = [];

let results20 = [];
let results100 = [];

async function userInput1() {
    if (training) return;
    while (userQueue.length > 0) {
        let value = userQueue.shift();
        let result = 0;
        input.push(value);
        if (predicated === null) {
            console.log(`Training: ${value}`);
        } else {
            if (value != predicated) {
                console.log(`HIT:  ${value} != ${predicated}`);
                result = 1;
            } else {
                console.error(`MISS: ${value} == ${predicated}`);
                result = 0;
            }
            results20.push(result);
            if (results20.length > 20) {
                results20.shift();
            }
            results100.push(result);
            if (results100.length > 100) {
                results100.shift();
            }
            let res20 = results20.reduce((v, x) => v + x, 0) / results20.length;
            let res100 = results100.reduce((v, x) => v + x, 0) / results100.length;
            minRes = Math.min(minRes, res20);
            if (res20 > minRes + 0.2) {
                newModel();
                minRes = res20;
            }
            plotData[2].push(res20);
            plotData[3].push(res100);
            console.log(`${Math.round(res20 * 100)}% hits over last ${results20.length} guesses, ${Math.round(res100 * 100)}% hits over last ${results100.length} guesses.`);
        }
        training = true;
        await train();
        training = false;
    }
}

let countHit = 0;
let countMiss = 0;

async function userInput() {
    console.log(userQueue);
    if (training) return;
    while (userQueue.length > 0) {
        let value = userQueue.shift();
        input.push(value);

        if (predicated === null) {
            predicated = Math.round(Math.random());
        }

        if (value != predicated) {
            countHit++;
            console.log(`HIT:  you ${countHit}, computer ${countMiss}. ${countHit > countMiss ? 'You winning!' : 'You loosing!'} `);
        } else {
            countMiss++;
            console.log(`MISS: you ${countHit}, computer ${countMiss}. ${countHit > countMiss ? 'You winning!' : 'You loosing!'} `);
        }

        if (countHit >= 25 || countMiss >= 25) {
            console.log(`----------------------------------------`);
            console.log(countHit > countMiss ? '      YOU WIN :D' : '      YOU LOOSE ;(');
            console.log(`----------------------------------------`);
            countHit = 0;
            countMiss = 0;
        }

        training = true;
        await train();
        training = false;
    }
}

let minRes = 1;


process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (key: string) {
    if (key === '\x1B' || key === '\x03') {
        process.exit();
    } else if ('0aA-[,'.indexOf(key) >= 0 || key === '\x1B\x5B\x42' || key === '\x1B\x5B\x44') {
        userQueue.push(0);
        userInput();
    } else if ('1bB+].'.indexOf(key) >= 0 || key === '\x1B\x5B\x41' || key === '\x1B\x5B\x43') {
        userQueue.push(1);
        userInput();
    }
});

async function test() {
    userQueue = [
        1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0,
        0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1,
        0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1,
        1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0,
        1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0,
        1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1,
        0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0,
        0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0,
        0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1,
    ];
    userInput();
}

//test();

//train();
