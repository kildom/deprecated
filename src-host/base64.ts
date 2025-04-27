
export function decode(data: string): ArrayBuffer | Promise<ArrayBuffer> {
    if (typeof (Uint8Array as any).fromBase64 === 'function') {
        return ((Uint8Array as any).fromBase64(data) as Uint8Array).buffer;
    } else if (typeof globalThis.Buffer === 'function' && globalThis.Buffer.prototype && globalThis.Buffer.from) {
        return globalThis.Buffer.from(data, 'base64').buffer;
    } else if (typeof globalThis.atob === 'function') {
        // Divide into three steps to reduce GUI freeze on slower machines.
        let binString = globalThis.atob(data);
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
    } else if (typeof globalThis.fetch === 'function') {
        return globalThis.fetch('data:application/octet-stream;base64,' + data)
            .then(res => res.arrayBuffer());
    } else {
        throw new Error('Not implemented');
    }
}
