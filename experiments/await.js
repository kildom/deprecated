


async function f() {
    //let x = new Promise((resolve, reject) => setTimeout(() => resolve(1), 1000));
    let a, b;
    let x = {
        then: function(resolve, reject) {
            console.log(resolve);
            a = resolve;
            console.log(reject);
            b = reject;
            setTimeout(() => {
                console.log('before resolve');
                resolve(1)
                console.log('after resolve');
            }, 1000);
        }
    };
    console.log(x);
    console.log('before await');
    console.log(await x);
    console.log('after await');
    console.log(x);
    let y = {
        then: function(resolve, reject) {
            console.log(resolve == a);
            console.log(reject == b);
            resolve(3);
        }
    };
    console.log(await y);
}

f();
