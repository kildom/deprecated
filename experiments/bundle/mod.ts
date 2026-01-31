

import { PA9, PA10 } from 'mues:gpio';
import { Term } from 'mues:serial';

const term = new Term();

term.setup({
    baudRate: 115200,
    bits: 8,
    parity: 'none',
    stopBits: 1,
    txPin: PA9,
    rxPin: PA10,
    mode: 'DMA',
    rxBufferSize: 256,
    txBufferSize: 64,
    rxTimeout: 10,
});

import { temp } from 'mues:temperature';

await temp.measure();

term.on('rx', (event: TermRxEvent) => {
    let data = term.readString();
    term.write(`Received: ${data}\n`);
});

term.on('error', (event: TermErrorEvent) => {
    term.write(`Error: ${event.message}\n`);
});

term.on('txComplete', (event: TermTxEvent) => {
    setTimeout(() => {
        term.write("Periodic message from Mues!\n");
    }, 1000);
});

let x = 13;

export function test() {
    term.write("One loop iteration!\n", x);
}

export { x as yyy };
