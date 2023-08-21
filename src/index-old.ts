
import * as tf from '@tensorflow/tfjs';
import * as fs from 'node:fs';
import * as chartist from 'chartist';
import * as chartistSvg from 'chartist-svg';

let trainData = `
0100101101010000101101001101111001010010010101111010011011010101001011001100101101010010011001001011
1010100110100100110100100101001000101011101011010010010101001010010001110010110011010100101011010010
0101110101011010100100101001001011011110101000110011010100110010010010110011100110010010101001100101
0101010111011101000101101001001101001011010011011101001101010100011101101010100110101001010100010101
1010101000101110010010010101101010101110100100101001010101011101001010100100101010010010010111010100
1010101101101110101001001011101001010011100101001100101010011100100010110101011010011100101010100010
1011100101101101001001001011001100010110100100101010110101100100110010100101110100101010101010111010
0101011101101010110101010110110010010010101010011101001001000101011101011101101001010101100111101010
0101101010110111010101010110101011010101001010101010001001110101010100101010101010101010110101001010
1010010101010010101010101010101010111101011000100010110010100101011100101001010101001100101011010010
0010101010101010101010110101011010100101010100100100100101101010110101010101001010101010011001010110
`;

let validateData = `
0100101101101011010101001010111011010101010101011101010001011010011101101010101101010010101100110101
0001010110101101010101110100100010111010111010010101010010010100101110110101011011101010110101010110
1011010101010010101001001001001010101011010100101001001001010010110110101000100111110010100111111001
`;

const model = tf.sequential();

const LEN = 16;

model.add(tf.layers.dense({ units: 30, inputShape: [LEN] }));
model.add(tf.layers.dense({ units: 8 }));
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

//model.compile({ loss: 'binaryCrossentropy', optimizer: 'adam', });
//model.compile({ loss: 'meanSquaredError', optimizer: 'sgd', });
model.compile({ loss: 'meanSquaredError', optimizer: 'adam', metrics: ['binaryAccuracy'] });


function dataToTensor(data: string) {
    let arr = data
        .replace(/[^01]/g, '')
        .split(new RegExp(''))
        .map(x => parseInt(x));
    let xa: number[][] = [];
    let ya: number[] = [];
    let zeros = 0;
    let count = Math.floor((arr.length - LEN - 1) / 2) * 2;
    for (let i = 0; i < count; i++) {
        xa.push(arr.slice(i, i + LEN));
        ya.push(arr[i + LEN]);
        if (arr[i + LEN] == 0) zeros++;
    }
    let delValue = 0;
    let delCount = zeros - count / 2;
    if (delCount < 0) {
        delValue = 1;
        delCount = -delCount;
    }
    for (let i = 0; i < count && delCount > 0; i++) {
        xa.splice(i, 1);
        ya.splice(i, 1);
        i--;
        delCount--;
    }
    return [tf.tensor2d(xa, [ya.length, LEN]), tf.tensor2d(ya, [ya.length, 1])];
}

async function train() {

    // Generate some synthetic data for training.
    let [xt, yt] = dataToTensor(trainData);
    let [xv, yv] = dataToTensor(validateData);

    // Train the model using the data.
    let plotData: number[][] = [[], [], [], []];
    await model.fit(xt, yt, {
        epochs: 20,
        validationData: [xv, yv],
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                plotData[0].push(logs.val_loss);
                plotData[1].push(logs.val_binaryAccuracy);
                plotData[2].push(logs.loss);
                plotData[3].push(logs.binaryAccuracy);
                console.log(epoch, logs);
            }
        }
    });

    let pred = model.predict(xv);
    let yp: number[] = (pred as any).arraySync();
    let ye: number[] = (yv as any).arraySync();
    let okCount: number = 0;
    for (let i = 0; i < yp.length; i++) {
        let res = yp[i] < 0.5 ? 0 : 1;
        if (res == ye[i]) okCount++;
        //console.log(res, ye[i], res == ye[i], yp[i]);
    }
    console.log(okCount, '/', ye.length, '=', okCount / ye.length * 100, '%');
    let plot = await chartistSvg('line',
        {
            labels: ['val_loss', 'val_binaryAccuracy', 'loss', 'binaryAccuracy'],
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
}

let input = [];
let predicated = 1;

function userInput(value: number) {
    if (value != predicated) {
        console.log(`HIT:  ${value} != ${predicated}`);
        input.push(value, 1);
    } else {
        console.error(`MISS: ${value} == ${predicated}`);
        input.push(value, 0);
    }
}


process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (key: string) {
    if (key === '\x1B' || key === '\x03') {
        process.exit();
    } else if ('0aA-[,'.indexOf(key) >= 0 || key === '\x1B\x5B\x42' || key === '\x1B\x5B\x44') {
        userInput(0);
    } else if ('1bB+].'.indexOf(key) >= 0 || key === '\x1B\x5B\x41' || key === '\x1B\x5B\x43') {
        userInput(1);
    }
});

//train();
