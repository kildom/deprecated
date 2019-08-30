

function reorder(input) {
    let r = input.map((x, i) => i);
    r.push(r.length);
    for (let i = 0; i < input.length; i++)
    {
        let t = r[i];
        r[i] = r[i + input[i]];
        r[i + input[i]] = t;
    }
    return r;
}


console.log(reorder([0,2]));
