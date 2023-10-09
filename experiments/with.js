
function f(arg) {
    let x = 'local';
    //with (arg) x = 'changed';
    console.log('local:', x);
}

global.obj = {};
//global.x = {};

obj = {x: 'with'}; f(obj); console.log(obj);
obj = {y: 'with'}; f(obj); console.log(obj);
obj = {x: undefined}; f(obj); console.log(obj);
function f(){x = 22; console.log(this)}
f();