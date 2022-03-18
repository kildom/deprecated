
const md5_shift = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

const md5_K = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]);


function md51(input) {

    function md5_chunk(input, output, temp) {
        //temp.set(output);
        let A = output[0] & 0xFFFFFFFF;
        let B = output[1] & 0xFFFFFFFF;
        let C = output[2] & 0xFFFFFFFF;
        let D = output[3] & 0xFFFFFFFF;

        for (let i = 0; i < 64; i++) {
            let F, g;
            if (i < 16) {
                F = (B & C) | (~B & D);
                g = i;
            } else if (i < 32) {
                F = (D & B) | (~D & C);
                g = (5 * i + 1) % 16;
            } else if (i < 48) {
                F = B ^ C ^ D;
                g = (3 * i + 5) % 16;
            } else {
                F = C ^ (B | ~D)
                g = (7 * i) % 16;
            }
            F = (F + A) & 0xFFFFFFFF;
            F = (F + md5_K[i]) & 0xFFFFFFFF;
            F = (F + input[g]) & 0xFFFFFFFF;
            let hi = F << md5_shift[i];
            let lo = F >>> (32 - md5_shift[i]);
            A = D
            D = C
            C = B
            B = (B + (hi | lo)) & 0xFFFFFFFF;
        }

        output[0] += A;
        output[1] += B;
        output[2] += C;
        output[3] += D;
    }
    const chunks = Math.ceil((input.length + 9) / 64);
    const roundDownLength = (chunks - 1) * 64;
    const buffer8 = new Uint8Array(64);
    const buffer32 = new Uint32Array(buffer8.buffer);
    const result32 = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
    const result8 = new Uint8Array(result32.buffer);
    const temp32 = new Uint32Array(4);

    for (let pos = 0; pos < roundDownLength; pos++) {
        buffer8.set(input.subarray(pos, pos + 64));
        md5_chunk(buffer32, result32, temp32);
    }

    buffer8.fill(0, 0, 64);
    buffer8.set(input.subarray(roundDownLength, input.length));
    buffer8[input.length % 64] = 0x80;
    buffer32[14] = input.length >>> 29;
    buffer32[15] = input.length << 3;
    md5_chunk(buffer32, result32, temp32);

    return result8;

}

function notmd5(input) {

    function md5_chunk(input, output, temp) {
        //temp.set(output);
        let A = output[0] & 0xFFFFFFFF;
        let B = output[1] & 0xFFFFFFFF;
        let C = output[2] & 0xFFFFFFFF;
        let D = output[3] & 0xFFFFFFFF;

        for (let i = 0; i < 16; i++) {
            let F, g;
            if (i < 4) {
                F = (B & C) | (~B & D);
            } else if (i < 8) {
                F = (D & B) | (~D & C);
            } else if (i < 12) {
                F = B ^ C ^ D;
            } else {
                F = C ^ (B | ~D);
            }
            F = (F + A) & 0xFFFFFFFF;
            F = (F + md5_K[i]) & 0xFFFFFFFF;
            F = (F + input[i]) & 0xFFFFFFFF;
            let hi = F << 5;
            let lo = F >>> (32 - 5);
            A = D
            D = C
            C = B
            B = (B + (hi | lo)) & 0xFFFFFFFF;
        }

        output[0] += A;
        output[1] += B;
        output[2] += C;
        output[3] += D;
    }
    const chunks = Math.ceil((input.length + 9) / 64);
    const roundDownLength = (chunks - 1) * 64;
    const buffer8 = new Uint8Array(64);
    const buffer32 = new Uint32Array(buffer8.buffer);
    const result32 = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
    const result8 = new Uint8Array(result32.buffer);
    const temp32 = new Uint32Array(4);

    for (let pos = 0; pos < roundDownLength; pos++) {
        buffer8.set(input.subarray(pos, pos + 64));
        md5_chunk(buffer32, result32, temp32);
    }

    buffer8.fill(0, 0, 64);
    buffer8.set(input.subarray(roundDownLength, input.length));
    buffer8[input.length % 64] = 0x80;
    buffer32[14] = input.length >>> 29;
    buffer32[15] = input.length << 3;
    md5_chunk(buffer32, result32, temp32);

    return result8;

}


let res = md51(new Uint8Array(0));

let hex = Buffer.from(res.buffer, res.byteOffset, res.byteLength).toString('hex');
console.log(hex);

let t = Date.now();
let res2 = notmd5(new Uint8Array(1024 * 1024));
console.log(Date.now() - t);



function createCrc32Table() {
    let crcTable = new Int32Array(256);
    for (let byte = 0; byte < 256; byte++) {
        let c = byte;
        for (let i = 0; i < 8; i++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[byte] = c;
    }
    return crcTable;
}

const crcTable = createCrc32Table();

function crc32(data, oldCrc) {
    let crc = !oldCrc ? -1 : ~oldCrc;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
    }
    return ~crc;
};


t = Date.now();
res2 = crc32(new Uint8Array(19 * 1024 * 1024));
console.log(Date.now() - t);

let a = crc32(new Uint8Array([1, 2]));
let b = crc32(new Uint8Array([3]), a);

console.log(b);

console.log(0xFFFFFFFF << 0);
