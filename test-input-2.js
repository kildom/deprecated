
function f() {
    console.log('module', exports.v);
    exports.v++;
    console.log(globalThis.Uint16Array);
}

exports.f = f;
exports.v = 99;
