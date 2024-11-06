
export function decode(data: string): ArrayBuffer | Promise<ArrayBuffer> {
    if (typeof Buffer === 'function' && !!Buffer.prototype && !!Buffer.from) {
        return Buffer.from(data, 'base64').buffer;
    } else if (typeof atob === 'function') {
        // Divide into three steps to reduce GUI freeze on slower machines.
        let binString = atob(data);
        return new Promise<ArrayBuffer>(resolve => { setTimeout(resolve, 5) })
            .then(() => {
                let bin = new Uint8Array(binString.length);
                let mid = Math.round(bin.length / 2);
                for (let i = 0; i < mid; i++) {
                    bin[i] = binString.charCodeAt(i);
                }
                return new Promise<ArrayBuffer>(resolve => { setTimeout(resolve, 5) })
                    .then(() => {
                        for (let i = mid; i < binString.length; i++) {
                            bin[i] = binString.charCodeAt(i);
                        }
                        return bin.buffer;
                    });
            });
    } else if (typeof fetch === 'function') {
        return fetch('data:application/octet-stream;base64,' + data)
            .then(res => res.arrayBuffer());
    } else {
        throw new Error('Not implemented');
    }
}
