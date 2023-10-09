

async function fasync(afterWait) {
    if (!afterWait) throw new Error('error immediate');
    await new Promise(r => setTimeout(r, 1000));
    throw new Error('error after wait');
}

function fsync(afterWait) {
    throw new Error('error sync');
}

try {
    //fsync(true); // Normal function throw
} catch (e) {
    console.log('SYNC:', e);
}

try {
    //fasync(true); // Async functions called without await always success
} catch (e) {
    console.log('ASYNC IMM:', e);
}

try {
    fasync(false); // Async functions are NOT executed immediate
    console.log('a');
} catch (e) {
    console.log('ASYNC DELAYED:', e);
}

setTimeout(() => {}, 2000);
