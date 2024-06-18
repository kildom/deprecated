
import * as fs from 'node:fs';
import assert from 'assert';

import { setSandboxModule, instantiate } from '../src-host/sandbox';

const INTERFACE_VERSION = 0;
const CUSTOM_SECTION_NAME = 'js-sandbox-CpktVgXbZaAHZ1ADnsj7IIxZbRTfIW24';
const CUSTOM_SECTION_MAGIC = 0x3BD89D5C;
const HARD_MEM_LIMIT = 512 * 1024 * 1024;
const MEM_PRE_ALLOC = 6 * 1024 * 1024;
const BLOCK_SIZE = 65536;

function getMemoryStats(memory: WebAssembly.Memory, stackPointer: number = 0) {
    console.log('Stack pointer', stackPointer);
    console.log('Total', memory.buffer.byteLength / 1024 / 1024, 'MB');
    let count = 0;
    let arr = new Uint32Array(memory.buffer);
    for (let i = stackPointer / 4; i < arr.length; i += 1) {
        if (arr[i] !== 0) count++;
    }
    console.log('Non-zero', count / 1024 / 1024 * 4, 'MB');
}


function leb128_size(x: number) {
    if (x < 128) return 1;
    if (x < 128 * 128) return 2;
    if (x < 128 * 128 * 128) return 3;
    if (x < 128 * 128 * 128 * 128) return 4;
    if (x < 128 * 128 * 128 * 128 * 128) return 5;
    return 6;
}

function leb128_create(x: number, exactBytes: number = -1000) {
    assert(x >= 0);
    assert(leb128_size(x) <= Math.abs(exactBytes));
    let res = new Uint8Array(10);
    let index = 0;
    do {
        exactBytes--;
        let value = x & 0x7F;
        x >>= 7;
        if (x != 0 || exactBytes > 0) value |= 0x80;
        res[index++] = value;
    } while (x != 0 || exactBytes > 0);
    return res.subarray(0, index);
}


const customSection = 0;
const typeSection = 1;
const importSection = 2;
const functionSection = 3;
const tableSection = 4;
const memorySection = 5;
const globalSection = 6;
const exportSection = 7;
const startSection = 8;
const elementSection = 9;
const codeSection = 10;
const dataSection = 11;
const dataCountSection = 12;

const typeI32 = 0x7F;
const typeI64 = 0x7E;
const typeF32 = 0x7D;
const typeF64 = 0x7C;

class Parser {

    offset: number;
    arr: Uint8Array;
    memory: Uint8Array;
    memoryOffset: number;
    out: (Uint8Array | null)[] = [];
    setSpTypeIndex: number = -1;
    getSpTypeIndex: number = -1;
    getSpFuncIndex: number = -1;
    setSpFuncIndex: number = -1;

    u32(): number {
        let arr = this.arr;
        let res = arr[this.offset++];
        res |= arr[this.offset++] << 8;
        res |= arr[this.offset++] << 16;
        res |= arr[this.offset++] << 24;
        return res;
    }

    leb128(): number {
        let arr = this.arr;
        let res = 0;
        let value: number;
        let bits = 0;
        do {
            value = arr[this.offset++];
            res |= (value & 0x7F) << bits;
            bits += 7;
        } while (value & 0x80);
        return res;
    }

    parseTypeSection(sectionStart: number, sectionEnd: number) {
        let arr = this.arr;
        let count = this.leb128();

        for (let i = 0; i < count; i++) {
            assert.equal(arr[this.offset++], 0x60, 'Function type prefix');
            let parametersCount = this.leb128();
            let param = arr[this.offset];
            this.offset += parametersCount;
            let resultsCount = this.leb128();
            let result = arr[this.offset];
            this.offset += resultsCount;
            if (parametersCount === 1 && resultsCount === 0 && param === typeI32) {
                this.setSpTypeIndex = i;
            }
            if (parametersCount === 0 && resultsCount === 1 && result === typeI32) {
                this.getSpTypeIndex = i;
            }
        }

        assert(this.getSpTypeIndex >= 0 && this.setSpTypeIndex >= 0);
    }

    funcIndexStart: number;
    globalIndexStart: number;

    parseImportSection(sectionStart: number, sectionEnd: number) {
        let arr = this.arr;
        let count = this.leb128();

        this.funcIndexStart = 0;
        this.globalIndexStart = 0;

        for (let i = 0; i < count; i++) {
            let len = this.leb128();
            this.offset += len;
            len = this.leb128();
            this.offset += len;
            let kind = arr[this.offset++];
            this.leb128();
            if (kind === 0x00) this.funcIndexStart++;
            if (kind === 0x03) this.globalIndexStart++;
            assert.notEqual(kind, 0x02, 'No import memory');
        }
    }

    outSize(startIndex: number, endIndex: number = -1) {
        if (endIndex < 0) {
            endIndex = this.out.length;
        }
        return this.out.slice(startIndex, endIndex).reduce((a, x) => a + x!.length, 0);
    }

    parseFunctionSection(sectionStart: number, sectionEnd: number) {
        let arr = this.arr;
        this.out.push(arr.subarray(sectionStart, sectionStart + 1)); // id
        let sectionSizeOutIndex = this.out.push(null) - 1; // section size
        let count = this.leb128();
        this.out.push(leb128_create(count + 2)); // count
        this.out.push(arr.subarray(this.offset, sectionEnd)); // old functions
        this.offset = sectionEnd;
        this.out.push(leb128_create(this.getSpTypeIndex));
        this.out.push(leb128_create(this.setSpTypeIndex));
        this.getSpFuncIndex = count;
        this.setSpFuncIndex = count + 1;
        this.out[sectionSizeOutIndex] = leb128_create(this.outSize(sectionSizeOutIndex + 1));
    }

    createFunction(bytecode: number[]) {
        let funcSizeOutIndex = this.out.push(null) - 1; // function size
        this.out.push(new Uint8Array([0])); // no locals
        this.out.push(new Uint8Array(bytecode)); // code
        this.out.push(new Uint8Array([0x0B])); // END
        this.out[funcSizeOutIndex] = leb128_create(this.outSize(funcSizeOutIndex + 1));
    }

    getName(name: string): Uint8Array {
        let x = new TextEncoder().encode(name);
        return new Uint8Array([x.length, ...x]);
    }

    stackPointerIndex: number;

    reshapeModuleParams: {
        stackPointValueBegin: number;
        stackPointValueEnd: number;
        dataSectionBegin: number;
        dataSectionEnd: number;
        memLimitsOffset: number;
    } = {} as any;

    parseExportSection(sectionStart: number, sectionEnd: number) {
        let arr = this.arr;
        this.out.push(arr.subarray(sectionStart, sectionStart + 1)); // id
        let sectionSizeOutIndex = this.out.push(null) - 1; // section size
        let count = this.leb128();
        this.stackPointerIndex = -1;
        this.out.push(leb128_create(count)); // count
        let actual_count = 0;
        for (let i = 0; i < count; i++) {
            let start = this.offset;
            let len = this.leb128();
            let name = new TextDecoder().decode(arr.subarray(this.offset, this.offset + len));
            this.offset += len;
            let kind = this.arr[this.offset++];
            let index = this.leb128();
            let end = this.offset;
            if (name === '__stack_pointer') {
                this.stackPointerIndex = index;
                let offsets = this.globalsOffsets[this.stackPointerIndex - this.globalIndexStart];
                this.reshapeModuleParams.stackPointValueBegin = offsets.start;
                this.reshapeModuleParams.stackPointValueEnd = offsets.end;
            } else if (name === '_start') {
                // The "_start" function is not needed any more. It was already executed.
            } else {
                this.out.push(arr.subarray(start, end));
                actual_count++;
            }
        }
        this.out.push(new Uint8Array([
            ...this.getName('__Internal__get_stack_pointer'),
            0x00,
            ...leb128_create(this.funcIndexStart + this.getSpFuncIndex)
        ]));
        actual_count++;
        this.out.push(new Uint8Array([
            ...this.getName('__Internal__set_stack_pointer'),
            0x00,
            ...leb128_create(this.funcIndexStart + this.setSpFuncIndex)
        ]));
        actual_count++;
        assert.equal(actual_count, count);
        this.out[sectionSizeOutIndex] = leb128_create(this.outSize(sectionSizeOutIndex + 1));
        assert.equal(this.offset, sectionEnd);
        assert(this.stackPointerIndex >= 0);
    }

    blocks: { offset: number, length: number, zeros: number }[] = [];

    prepareDataBlocks() {
        let mem = this.memory;
        this.blocks = [];

        const THRESHOLD = 16; // for small optimizations: find smallest value

        let zeroCount = 0;
        let dataStart = this.memoryOffset;
        let zeroStart = this.memoryOffset;
        for (let i = this.memoryOffset; i < mem.length; i++) {
            let zero = mem[i] == 0;
            if (zero) {
                zeroCount++;
            } else {
                if (zeroCount >= THRESHOLD) {
                    this.blocks.push({
                        offset: dataStart,
                        length: zeroStart - dataStart,
                        zeros: i - zeroStart,
                    });
                    dataStart = i;
                }
                zeroCount = 0;
                zeroStart = i + 1;
            }
        }

        if (zeroStart - dataStart > 0) {
            this.blocks.push({
                offset: dataStart,
                length: zeroStart - dataStart,
                zeros: 0,
            });
        }

        if (this.blocks[0].length === 0) {
            this.blocks.shift();
        }
    }

    parseDataSection(sectionStart: number, sectionEnd: number) {
        this.reshapeModuleParams.dataSectionBegin = this.outSize(0) + 1;
        this.offset = sectionEnd;
        this.out.push(new Uint8Array([dataSection]));
        let sectionSizeIndex = this.out.push(null) - 1;
        this.out.push(leb128_create(this.blocks.length));
        for (let block of this.blocks) {
            this.out.push(new Uint8Array([
                0x00, // kind: active, memory 0
                0x41, ...leb128_create(block.offset), // i32.const block.offset
                0x0B, // end
                ...leb128_create(block.length), // size
            ]));
            this.out.push(new Uint8Array(this.memory.subarray(block.offset, block.offset + block.length)));
        }
        this.out[sectionSizeIndex] = leb128_create(this.outSize(sectionSizeIndex + 1));
        this.reshapeModuleParams.dataSectionEnd = this.outSize(0);
    }

    parseDataCountSection(sectionStart: number, sectionEnd: number) {
        this.out.push(new Uint8Array([
            dataCountSection,
            ...leb128_create(leb128_size(this.blocks.length)),
            ...leb128_create(this.blocks.length),
        ]));
        this.offset = sectionEnd;
    }

    parseMemorySection(sectionStart: number, sectionEnd: number) {
        let arr = this.arr;
        let count = this.leb128();
        assert.equal(count, 1, 'Exactly one memory.');
        this.offset++; // ignore limit kind
        let min = this.leb128();
        this.offset = sectionEnd;

        let expectedBlocks = Math.max(min, Math.ceil(this.memory.length / BLOCK_SIZE)) + MEM_PRE_ALLOC / BLOCK_SIZE;
        this.out.push(new Uint8Array([
            memorySection,
            8, // size
            1, // memory count
            0x01, // upper limit present
            ...leb128_create(expectedBlocks, 3),
            ...leb128_create(HARD_MEM_LIMIT / BLOCK_SIZE, 3),
        ]));
        this.reshapeModuleParams.memLimitsOffset = this.outSize(0) - 3 - 3;
    }

    parseCodeSection(sectionStart: number, sectionEnd: number) {
        let arr = this.arr;
        this.out.push(arr.subarray(sectionStart, sectionStart + 1)); // id
        let sectionSizeOutIndex = this.out.push(null) - 1; // section size
        let count = this.leb128();
        this.out.push(leb128_create(count + 2)); // count
        this.out.push(arr.subarray(this.offset, sectionEnd)); // old functions
        this.offset = sectionEnd;
        this.createFunction([
            0x23, ...leb128_create(this.stackPointerIndex), // global.get
        ]);
        this.createFunction([
            0x20, ...leb128_create(0), // local.get 0
            0x24, ...leb128_create(this.stackPointerIndex), // global.set
        ]);
        this.out[sectionSizeOutIndex] = leb128_create(this.outSize(sectionSizeOutIndex + 1));
    }

    globalsOffsets: { start: number, end: number }[] = [];

    parseGlobalSection(sectionStart: number, sectionEnd: number) {
        let outSectionStart = this.outSize(0);
        let arr = this.arr;
        let count = this.leb128();
        this.globalsOffsets = [];

        for (let i = 0; i < count; i++) {
            this.offset++; // Type
            assert(arr[this.offset++] <= 0x01, 'Global type');
            let instr = arr[this.offset++];
            let start = this.offset;
            if (instr === 0x41 || instr === 0x42) {
                this.leb128();
            } else if (instr === 0x43) {
                this.offset += 4;
            } else if (instr === 0x44) {
                this.offset += 8;
            } else {
                assert(false, 'Unsupported instruction in global initialization value');
            }
            let end = this.offset;
            this.globalsOffsets.push({
                start: start - sectionStart + outSectionStart,
                end: end - sectionStart + outSectionStart,
            });
            assert.equal(arr[this.offset++], 0x0B, 'END instruction');
        }
    }

    createCustomSection() {

        this.out.push(new Uint8Array([
            customSection,
            1 + CUSTOM_SECTION_NAME.length + 7 * 4,
            CUSTOM_SECTION_NAME.length,
            ...new TextEncoder().encode(CUSTOM_SECTION_NAME),
        ]));

        let struct = new DataView(new ArrayBuffer(7 * 4));
        struct.setUint32(4 * 0, INTERFACE_VERSION, true);
        struct.setUint32(4 * 1, this.reshapeModuleParams.stackPointValueBegin, true);
        struct.setUint32(4 * 2, this.reshapeModuleParams.stackPointValueEnd, true);
        struct.setUint32(4 * 3, this.reshapeModuleParams.dataSectionBegin, true);
        struct.setUint32(4 * 4, this.reshapeModuleParams.dataSectionEnd, true);
        struct.setUint32(4 * 5, this.reshapeModuleParams.memLimitsOffset, true);
        struct.setUint32(4 * 6, CUSTOM_SECTION_MAGIC, true);

        this.out.push(new Uint8Array(struct.buffer));
    }

    parseModule(arr: Uint8Array, memory: Uint8Array, memoryOffset: number) {
        this.arr = arr;
        this.memory = memory;
        this.memoryOffset = memoryOffset;
        this.prepareDataBlocks();
        this.offset = 8; // skip header and version
        this.out.push(arr.subarray(0, 8));
        while (this.offset < arr.length) {
            let sectionStart = this.offset;
            let id = arr[this.offset++];
            let size = this.leb128();
            let sectionEnd = this.offset + size;
            switch (id) {
                case typeSection:
                    this.parseTypeSection(sectionStart, sectionEnd);
                    this.out.push(arr.subarray(sectionStart, sectionEnd));
                    break;
                case functionSection:
                    this.parseFunctionSection(sectionStart, sectionEnd);
                    break;
                case importSection:
                    this.parseImportSection(sectionStart, sectionEnd);
                    this.out.push(arr.subarray(sectionStart, sectionEnd));
                    break;
                case globalSection:
                    this.parseGlobalSection(sectionStart, sectionEnd);
                    this.out.push(arr.subarray(sectionStart, sectionEnd));
                    break;
                case exportSection:
                    this.parseExportSection(sectionStart, sectionEnd);
                    break;
                case codeSection:
                    this.parseCodeSection(sectionStart, sectionEnd);
                    break;
                case dataSection:
                    this.parseDataSection(sectionStart, sectionEnd);
                    break;
                case dataCountSection:
                    this.parseDataCountSection(sectionStart, sectionEnd);
                    break;
                case memorySection:
                    this.parseMemorySection(sectionStart, sectionEnd);
                    break;
                case startSection:
                    // Remove start section - already started
                    break;
                default:
                    this.offset += size;
                    this.out.push(arr.subarray(sectionStart, sectionEnd));
                    break;
            }
        }
        this.updateStackPointer();
        this.createCustomSection(); // TODO: Create after final optimization, because optimizer may reorder it.
    }

    updateStackPointer() {
        let bin = this.getOutput();
        this.out = [bin];
        let re = this.reshapeModuleParams;
        let arr = bin.subarray(re.stackPointValueBegin, re.stackPointValueEnd);
        let sp = this.memoryOffset;
        assert(arr.length >= leb128_size(this.memoryOffset));
        for (let i = 0; i < arr.length; i++) {
            arr[i] = ((sp >> (7 * i)) & 0x7F) | 0x80;
        }
        arr[arr.length - 1] &= 0x7F;
    }

    getOutput(): Uint8Array {
        let size = this.outSize(0);
        let res = new Uint8Array(size);
        let offset = 0;
        for (let chunk of this.out) {
            res.set(chunk as any, offset);
            offset += chunk!.length;
        }
        return res;
    }
}

async function main() {

    let fileName: string;

    do {
        fileName = '../release/sandbox.opt.wasm';
        if (fs.existsSync(fileName)) break;
        fileName = '../quickbuild/sandbox.wasm';
        if (fs.existsSync(fileName)) break;
        fileName = '../debug/sandbox.wasm';
        if (fs.existsSync(fileName)) break;
    } while (false);

    let bin = fs.readFileSync(fileName);

    let module = await WebAssembly.compile(bin);
    setSandboxModule(module);

    console.log("--------- Full");
    let sandbox = await instantiate({ maxHeapSize: 1024 * 1024 * 1024 });
    let instance = (sandbox as any).__Internal__instance as WebAssembly.Instance;
    let memory = instance.exports.memory as WebAssembly.Memory;
    let stackPointer = (instance.exports.__stack_pointer as WebAssembly.Global).value as number;
    getMemoryStats(memory, stackPointer);

    console.log("--------- Clear Module");
    let instanceClear = await WebAssembly.instantiate(module, (sandbox as any).imports);
    let stackPointerClear = (instanceClear.exports.__stack_pointer as WebAssembly.Global).value as number;
    getMemoryStats(instanceClear.exports.memory as any, stackPointerClear);

    console.log("--------- Init only");
    sandbox = await instantiate({ maxHeapSize: 1024 * 1024 * 1024, __Internal__no_boot: true } as any);
    instance = (sandbox as any).__Internal__instance as WebAssembly.Instance;
    memory = instance.exports.memory as WebAssembly.Memory;
    stackPointer = (instance.exports.__stack_pointer as WebAssembly.Global).value as number;
    getMemoryStats(memory, stackPointer);

    console.log("--------- Parse");

    let arr = new Uint8Array(memory.buffer);

    let p = new Parser();
    p.parseModule(bin, arr, stackPointer);
    fs.writeFileSync('../release/processed.wasm', p.getOutput());
    process.exit(0);

    const THRESHOLD = 16; // for small optimizations: find smallest value

    let blocks: { offset: number, data: number, zeros: number }[] = [];
    let zeroCount = 0;
    let dataStart = stackPointer;
    let zeroStart = stackPointer;
    for (let i = stackPointer; i < arr.length; i++) {
        let zero = arr[i] == 0;
        if (zero) {
            zeroCount++;
        } else {
            if (zeroCount >= THRESHOLD) {
                blocks.push({
                    offset: dataStart,
                    data: zeroStart - dataStart,
                    zeros: i - zeroStart,
                });
                dataStart = i;
            }
            zeroCount = 0;
            zeroStart = i + 1;
        }
    }

    if (zeroStart - dataStart > 0) {
        blocks.push({
            offset: dataStart,
            data: zeroStart - dataStart,
            zeros: 0,
        });
    }

    // remove export __stack_pointer
    // run wasm-opt again to remove unused functions

    //console.log([...arr.subarray(stackPointer, stackPointer + 200)].map((x, i) => `${i}: ${x}`).join('\n'));
    //console.log(blocks);
    let blockHeadsSize = blocks.reduce((p, block) => p + 1 + 1 + leb128_size(block.offset) + 1 + leb128_size(block.data), 0);
    console.log(blocks.length);
    console.log(blocks.at(-1));
    console.log(blockHeadsSize + blocks.reduce((p, x) => p + x.data, 0));


}

main();


