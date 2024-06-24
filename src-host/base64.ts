
export function decode(data: string): ArrayBuffer | Promise<ArrayBuffer> {
    if (typeof Buffer === 'function' && !!Buffer.prototype && !!Buffer.from) {
        return Buffer.from(data, 'base64').buffer;
    } else if (typeof atob === 'function') {
        let binString = atob(data);
        let bin = new Uint8Array(binString.length);
        for (let i = 0; i < bin.length; i++) {
            bin[i] = binString.charCodeAt(i);
        }
        return bin.buffer;
    } else if (typeof fetch === 'function') {
        return fetch('data:application/octet-stream;base64,' + data)
        .then(res => {
            return res.arrayBuffer();
        })
        .then(arr => arr);
    } else {
        throw new Error('Not implemented');
    }
}
