"use strict";

function def(x) {
    console.log('get def', x);
    return 'def' + x;
}

var k = 'global';

function f(x=def(k)) {
    var k = 'local';
}

f()
