

function f() {
    try {
        return 'main';
    } finally {
        console.log('finally');
    }
}

console.log(f());

function f2() {
    try {
        return 'main';
    } finally {
        console.log('finally');
        return 'finally';
    }
}


console.log('------------------------');
console.log(f2());
