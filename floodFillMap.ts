import * as fs from 'node:fs';


function numberToTable(n: number): number[][] {
    const order = [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [2, 1],
        [0, 2],
        [1, 2],
        [2, 2],
    ].reverse();
    let tab = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ];
    for (let j = 0; j < 8; j++) {
        if (n & (1 << j)) {
            let [x, y] = order[j];
            tab[x][y] = 1;
        }
    }
    return tab;
}

function tableToString(tab: number[][]): string {
    tab = tab[0].map((_, i) => tab.map(row => row[i]));
    return tab.map(row => row.join(' ')).join('\n');
}

let code = `
#ifndef FLOOD_FILL_MAP_H
#define FLOOD_FILL_MAP_H

#include <stdint.h>

struct FloodFillMapEntry {
    uint8_t count;
    struct {
        int8_t dx;
        int8_t dy;
    } jumps[4];
};

static FloodFillMapEntry floodFillMap[256] = {
`;

for (let i = 0; i < 256; i++) {
    let tab = numberToTable(i);
    let jumps: [number, number][] = [];
    do {
        let sum = tab.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);
        if (sum === 0) break;
        let x = 0, y = 0;
        outerLoop:
        for (x = 0; x < 3; x++) {
            for (y = 0; y < 3; y++) {
                if (tab[x][y]) {
                    break outerLoop;
                }
            }
        }
        jumps.push([x, y]);
        let stack = [[x, y]];
        while (stack.length > 0) {
            [x, y] = stack.pop()!;
            tab[x][y] = 0;
            if (tab[x - 1]?.[y - 1]) stack.push([x - 1, y - 1]);
            if (tab[x - 1]?.[y + 0]) stack.push([x - 1, y + 0]);
            if (tab[x - 1]?.[y + 1]) stack.push([x - 1, y + 1]);
            if (tab[x + 0]?.[y - 1]) stack.push([x + 0, y - 1]);
            if (tab[x + 0]?.[y + 0]) stack.push([x + 0, y + 0]);
            if (tab[x + 0]?.[y + 1]) stack.push([x + 0, y + 1]);
            if (tab[x + 1]?.[y - 1]) stack.push([x + 1, y - 1]);
            if (tab[x + 1]?.[y + 0]) stack.push([x + 1, y + 0]);
            if (tab[x + 1]?.[y + 1]) stack.push([x + 1, y + 1]);
        }
    } while (true);
    //console.log(`Number: ${i}, Sum: ${sum}`);
    console.log(tableToString(numberToTable(i)));
    console.log('Jumps: ' + jumps.map(([dx, dy]) => `(${dx}, ${dy})`).join(', '));
    console.log('---');
    code += `    { .count = ${jumps.length}, .jumps = { `;
    code += jumps.map(([dx, dy]) => `{${dx - 1}, ${dy - 1}}`).join(', ');
    code += ' } },\n';
}

code += '};\n#endif // FLOOD_FILL_MAP_H\n';

fs.writeFileSync('src/floodFillMap.hh', code);
