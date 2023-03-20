/*"strict"

String.prototype.x = function() {
    console.log(this);
}

const m = require('./test-input-2');

console.log(globalThis.Uint16Array);
globalThis.Uint16Array = 12;
console.log(globalThis.Uint16Array);

console.log('Hello World!!!');

console.log('local', m.v);
m.f();
// v = 12;
console.log('local', m.v);
m.f();
console.log('local', m.v);

"aaa".x();*/

let v = 12;
console.log("value", 12);

function f() {
    console.log(x);
    let x = 10;
    console.log(x);
}

f();
