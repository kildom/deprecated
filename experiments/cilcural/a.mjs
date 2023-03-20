
import { b, x as bx } from "./b.mjs";

export var x;
console.log('before a', x);

export function a() {
    console.log('a', x);
    console.log('bx', bx);
    x = 101;
}

console.log('init a');
b();

x = 100;
