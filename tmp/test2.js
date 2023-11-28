//'use strict';

async function f() {
    console.log('f1');
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('before');
            resolve();
            console.log('after');
        }, 100)
    });
    console.log('f2');
}

async function f2() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 1;
}

async function main() {
    f();
    console.log('global');
    console.log(f2());
}

setTimeout(main, 1);
