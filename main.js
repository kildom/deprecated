const fs = require('fs');

let korytaz = [
    [64.2, 88.3],
    [15, 233.75],
    [0, 248.8],
    [0, 248.9],
    [0, 248.9],
    [15, 220],
    [14, 109.9],
    [14, 110.2],
    [14, 110.6],
    [14, 110.9] // 7,0,6,9,3,5,1,4,8,2
];

let sypialnia1 = [
    [0, 477.7 - 1.4, 4],
    [0, 459.5 - 1.4, 5],
    [0, 459.4 - 1.4, 4],
    [0, 459.3 - 1.4, 2] // 2,5,9,13,6,10,1,12,8,4,0,11,7,3,14
];

let garderoba = [
    [0, 190, 1],
    [0, 190.3, 1],
    [0, 190.5, 1],
    [0, 190.6, 1],
    [0, 190.7, 1],
    [0, 190.7, 1],
    [0, 190.6, 1],
    [0, 190.6, 1],
    [0, 190.5, 1],
    [0, 190.5, 1] // 6,9,0,5,2,1,8,7,4,3
];

let sypialnia2 = [
    [97, 147.5, 1],
    [0, 491.9, 1],
    [0, 491.8, 1],
    [0, 491.7, 1],
    [0, 491.5, 1],
    [0, 491.4, 1],
    [0, 491.3, 1],
    [0, 491.1, 1],
    [0, 491.0, 1],
    [0, 490.9, 1],
    [0, 490.8, 1],
].map(x => [x[0], x[1] - 1.5, x[2]]); // [9,4,10,5,2,8,3,0,6,1,7]

let predefined;
//predefined = [6,9,0,5,2,1,8,7,4,3];


let room = sypialnia2;

let minX = Infinity;
let maxX = -Infinity;

const length = 129.2;
const width = 32.6;
const minPiece = 10;
const minFirstDiff = 36;
const minSecondDiff = 25;
const cutLength = 0.3;
const bucket = ([28.000000001, 86.70000001, 97.600001]);
const endings = []//[31.3];
const oldLeft = bucket.shift();

let room2 = [];
let reorder = [];
for (let l of room)
{
    if (!l[2]) l[2] = 1;
    for (let i =0; i < l[2]; i++)
    {
        room2.push({start: l[0], end: l[0] + l[1]});
        minX = Math.min(minX, l[0]);
        maxX = Math.max(maxX, l[0] + l[1]);
        reorder.push(reorder.length);
    }
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function shuffle1(a) {
    for (let i = a.length - 1; i > 1; i--) {
        const j = 1 + Math.floor(Math.random() * i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

room = room2;

function checkDiff(lineIndex, cut, minDiff)
{
    if (lineIndex < 0 || lineIndex >= room.length) return true;
    let line = room[lineIndex];
    if (!('cut' in line)) return true;
    let d = Math.abs(line.cut - cut);
    if (d > length / 2) d = length - d;
    return d >= minDiff;
}

function lineMatching(lineIndex, left)
{
    let line = room[lineIndex];
    let cut = line.start + left;
    return checkDiff(lineIndex - 2, cut, minSecondDiff)
        && checkDiff(lineIndex - 1, cut, minFirstDiff)
        && checkDiff(lineIndex + 1, cut, minFirstDiff)
        && checkDiff(lineIndex + 2, cut, minSecondDiff);
}

function solveRoom(reorder)
{
    let oldRoom = room;
    room = JSON.parse(JSON.stringify(room));
    let bucket2 = JSON.parse(JSON.stringify(bucket));
    let endings2 = JSON.parse(JSON.stringify(endings));
    let left = oldLeft;
    reorder = reorder.slice();
    let newOrder = [];
    while (reorder.length > 0)
    {
        let foundIndex = false;
        for (let lineIndex of reorder)
        {
            if (lineMatching(lineIndex, left))
            {
                foundIndex = lineIndex;
                break;
            }
        }
        if (foundIndex === false)
        {
            room = oldRoom;
            return false;
        }
        newOrder.push(foundIndex);
        let line = room[foundIndex];
        let pos = reorder.indexOf(foundIndex);
        reorder.splice(pos, 1);
        line.cut = line.start + left;
        let needed = line.end - line.start - left;
        if (needed < 0)
        {
            delete line.cut;
            left = left - (line.end - line.start) - cutLength;
        }
        else 
        {
            let full = Math.floor(needed / length);
            let last = needed - length * full;
            if (last < minPiece)
            {
                room = oldRoom;
                return false;
            }
            if (endings2.length > 0 && last <= endings2[0])
            {
                left = length;
                endings2.shift();
            }
            else
            {
                left = length - last - cutLength;
            }
        }
        if (left < minPiece)
        {
            if (bucket2.length > 0)
                left = bucket2.shift();
            else
                left = 0;
        }
    }
    room = oldRoom;
    return newOrder;
}

if (!predefined) {

    let newOrder;
    for (let i = 0; i < 1000000; i++)
    {
        shuffle(reorder);
        newOrder = solveRoom(reorder);
        if (newOrder !== false) break;
    }
    if (newOrder === false) throw Error('Not found!');
    reorder = newOrder;

} else {

    reorder = predefined;

}

console.log(JSON.stringify(reorder));

/*reorder = [3,1,5,14,11,10,12,7,8,4,0,13,2,9,6];
reorder = solveRoom(reorder);
if (reorder === false) throw Error('Invalid');*/

/*
let best = Infinity;

for (let i = 0; i < 10000; i++)
{
    shuffle(reorder);
    let unmatched = solveRoom(reorder);
    //console.log(unmatched);
    best = Math.min(best, unmatched);
}

console.log(`BEST: ${best}`);*/


let left = oldLeft;
let leftIndex = 'X';
let nextIndex = 1;
let waist = 0;
let counter = 0;
let bucket2 = JSON.parse(JSON.stringify(bucket));
let endings2 = JSON.parse(JSON.stringify(endings));

for (let j = 0; j < reorder.length; j++)
{
    let lineIndex = reorder[j];
    let line = room[lineIndex];
    let needed = line.end - line.start - left;
    if (needed < 0)
    {
        line.pieces = [{length: line.end - line.start, index: leftIndex}];
        left = left - line.pieces[0].length - cutLength;
    }
    else
    {
        line.pieces = left > 0 ? [{length: left, index: leftIndex}] : [];
        let full = Math.floor(needed / length);
        for (let i = 0; i < full; i++)
        {
            line.pieces.push({length: length, index: ''});
            counter++;
        }
        let last = needed - length * full;
        counter++;
        leftIndex = nextIndex++;
        leftIndex = lineIndex;
        if (endings2.length > 0 && last <= endings2[0])
        {
            left = length;
            endings2.shift();
            line.pieces.push({length: last, index: `${leftIndex}E`});
        }
        else
        {
            left = length - last - cutLength;
            line.pieces.push({length: last, index: leftIndex});
        }
    }
    if (left < minPiece || left == length)
    {
        console.log(`WAIST: ${left}`);
        waist += left;
        leftIndex = -1;
        if (bucket2.length > 0)
            left = bucket2.shift();
        else
            left = 0;
    }
}

console.log(`TOTAL WAIST: ${waist}`);
console.log(`LEFT OVER: ${left}    #${leftIndex}`);
console.log(`COUNT: ${counter}`);

let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`
svg += `<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="${minX - length} 0 ${maxX - minX + 2*length} ${width * room.length}" height="${width * room.length}" width="${maxX - minX + 2*length}">`;


let y = 0;

for (let line of room)
{
    let x = line.start;
    let first = true;
    for (let piece of line.pieces)
    {
        svg += `<rect y="${y}" x="${x}" height="${width}" width="${piece.length}" style="fill:#d3d3d3;stroke:#ff6208;stroke-width:0.1mm;" />`;
        x += piece.length;
        if (piece.length < length) {
            if (first)
                svg += `<rect y="${y}" x="${x - length}" height="${width}" width="${length - piece.length}" style="fill:#FFF;stroke:#AAA;stroke-width:0.1mm;" />`;
            else
                svg += `<rect y="${y}" x="${x}" height="${width}" width="${length - piece.length}" style="fill:#FFF;stroke:#AAA;stroke-width:0.1mm;" />`;
        }
        first = false;
    }
    x = line.start;
    let sh = 0;
    for (let piece of line.pieces)
    {
        svg += `<text style="font-size:10px;font-family:sans-serif;font-weight:bold;fill:#0000CC;" x="${x + 2}" y="${y + width * 0.8 - sh}">${piece.index}</text>`;
        svg += `<text style="font-size:7px;font-family:sans-serif;fill:#000000;" x="${x + 14}" y="${y + width * 0.8 - sh}">(${Math.round(piece.length * 10) / 10})</text>`;
        x += piece.length;
        sh ^= 9;
    }
    y += width;
} 

svg += `<text style="font-size:5px;font-family:sans-serif;fill:#000000;" x="0" y="5">${JSON.stringify(reorder)}</text>`;

svg += `</svg>`;

fs.writeFileSync('out.svg', svg);

console.log(room); 

//SVGDefsElement();