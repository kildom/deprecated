//"use strict";

function def(x) {
    console.log('get def', x);
    return 'def' + x;
}

var k = 'global';

function f(x=def(k)) {
    var k = 'local';
}

f()


console.log('globalVar', globalThis.globalVar);

eval(`
function ff() {
    "use strict";
    console.log('this in ff', globalVar);
}
    `);

globalVar = 12;

ff();

