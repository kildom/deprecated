
import { a, x as ax } from "./a.mjs";

export var x;

export function b() {
    console.log('b', x);
    console.log('ax', ax);
    x = 201;
}

console.log('init b');
a();

x = 200;
