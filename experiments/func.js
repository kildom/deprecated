"use strict";

const util = require('util');

function f(x,y,z) {
    console.log('f');
}

let opt = {
    showHidden: true,
    depth: null,
    showProxy: true,
    sorted: false,
    getters: true,
};

console.log(util.inspect(f, opt));
console.log(util.inspect(f.prototype, opt));
console.log(util.inspect(Object.getPrototypeOf(f), opt));

function a() {
    console.log('a');
}


function b() {
    console.log('b');
}

function test2() {
    {
        c();
        let x = 123;
        function c() {
            console.log('c', x);
        }
        a = b;
        a();
    }
}

a();
test2();
a();
