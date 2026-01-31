

import { PA1, PA2 } from 'mues:gpio';
import { test, yyy } from './mod';

export let x = 12;

while (true) {
    let y = x * 2;
    for (let i = 0; i < 1000000; i++) {
        PA1.some(() => i);
    }
    PA1.setHigh(x);
    await new Promise(resolve => setTimeout(resolve, 100));
    PA2.setLow(yyy);
    await new Promise(resolve => setTimeout(resolve, 100));
    PA1.setLow();
    await new Promise(resolve => setTimeout(resolve, 100));
    PA2.setHigh();
    await new Promise(resolve => setTimeout(resolve, 100));
    test();
}

