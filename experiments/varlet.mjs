'use strict';

let q;

function f() {
    var x = 2;
    {
        g();
        var x = 1;
        let w = 123;
        console.log(x + w);
    }
    function g() { console.log('g' + x); }
    return x + q;
}

console.log(f());

q = 12;

function ft(i) {
    var i = 12;
    {
    
    }
    console.log(i);
}

ft();
