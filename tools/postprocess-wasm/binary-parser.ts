
import assert from 'assert';

const INTERFACE_VERSION = 0;
const CUSTOM_SECTION_NAME = 'js-sandbox-CpktVgXbZaAHZ1ADnsj7IIxZbRTfIW24';
const CUSTOM_SECTION_MAGIC = 0x3BD89D5C;
const HARD_MEM_LIMIT = 512 * 1024 * 1024;
const MEM_PRE_ALLOC = 6 * 1024 * 1024;
const BLOCK_SIZE = 65536;
const SPEED_OPTIMIZE_HOLE_SIZE_THRESHOLD = 16;


const encoder = new TextEncoder();
const decoder = new TextDecoder()

let offset: number;
let bin: Uint8Array;
let memory: Uint8Array;
let stackPointer: number;
let out: (Uint8Array | null)[] = [];
let setSpTypeIndex: number = -1;
let getSpTypeIndex: number = -1;
let getSpFuncIndex: number = -1;
let setSpFuncIndex: number = -1;
let funcIndexStart: number;
let globalIndexStart: number;
let stackPointerIndex: number;
let reshapeModuleParams: {
    stackPointValueBegin: number;
    stackPointValueEnd: number;
    dataSectionBegin: number;
    dataSectionEnd: number;
    memLimitsOffset: number;
} = {} as any;
let blocks: { offset: number, length: number, zeros: number }[] = [];
let globalsOffsets: { start: number, end: number }[] = [];


export function parseModule(moduleBinary: Uint8Array, currentMemory: Uint8Array, currentStackPointer: number, sizeOptimize) {

    offset = 0;
    bin = moduleBinary;
    memory = currentMemory;
    stackPointer = currentStackPointer;
    out = [];
    setSpTypeIndex = -1;
    getSpTypeIndex = -1;
    getSpFuncIndex = -1;
    setSpFuncIndex = -1;
    funcIndexStart = -1;
    globalIndexStart = -1;
    stackPointerIndex = -1;
    reshapeModuleParams = {} as any;
    blocks = [];
    globalsOffsets = [];

    if (!sizeOptimize) {
        prepareDataBlocks(SPEED_OPTIMIZE_HOLE_SIZE_THRESHOLD);
    } else {
        let bestSize = Infinity;
        let bestThreshold = Infinity;
        for (let i = 6; i <= SPEED_OPTIMIZE_HOLE_SIZE_THRESHOLD; i++) {
            let size = prepareDataBlocks(i);
            if (size <= bestSize) {
                bestSize = size;
                bestThreshold = i;
            }
        }
        prepareDataBlocks(bestThreshold);
    }

    offset += 8; // skip header and version
    output(bin.subarray(0, 8));
    while (offset < bin.length) {
        let sectionStart = offset;
        let id = bin[offset++];
        let size = leb128();
        let sectionEnd = offset + size;
        switch (id) {
            case SectionType.typeSection:
                parseTypeSection(sectionStart, sectionEnd);
                output(bin.subarray(sectionStart, sectionEnd));
                break;
            case SectionType.functionSection:
                parseFunctionSection(sectionStart, sectionEnd);
                break;
            case SectionType.importSection:
                parseImportSection(sectionStart, sectionEnd);
                output(bin.subarray(sectionStart, sectionEnd));
                break;
            case SectionType.globalSection:
                parseGlobalSection(sectionStart, sectionEnd);
                output(bin.subarray(sectionStart, sectionEnd));
                break;
            case SectionType.exportSection:
                parseExportSection(sectionStart, sectionEnd);
                break;
            case SectionType.codeSection:
                parseCodeSection(sectionStart, sectionEnd);
                break;
            case SectionType.dataSection:
                parseDataSection(sectionStart, sectionEnd);
                break;
            case SectionType.dataCountSection:
                parseDataCountSection(sectionStart, sectionEnd);
                break;
            case SectionType.memorySection:
                parseMemorySection(sectionStart, sectionEnd);
                break;
            case SectionType.startSection:
                // Remove start section - already started
                break;
            default:
                offset += size;
                output(bin.subarray(sectionStart, sectionEnd));
                break;
        }
    }
    updateStackPointer();
    return getOutput();
}

function output(value: number | string | Uint8Array | number[] | null): number {
    let res = out.length;
    if (typeof value === 'number') {
        out.push(leb128Create(value));
    } else if (typeof value === 'string') {
        let b = encoder.encode(value);
        out.push(new Uint8Array([
            ...leb128Create(b.length),
            ...b,
        ]));
    } else if (value instanceof Uint8Array) {
        out.push(value);
    } else if (Array.isArray(value)) {
        out.push(new Uint8Array(value));
    } else if (value === null) {
        out.push(null);
    } else {
        assert(false, 'Unexpected value type');
    }
    return res;
}

function replace(index: number, value: number | string | Uint8Array | number[] | null): void {
    if (typeof value === 'number') {
        out[index] = leb128Create(value);
    } else if (typeof value === 'string') {
        let b = encoder.encode(value);
        out[index] = new Uint8Array([
            ...leb128Create(b.length),
            ...b,
        ]);
    } else if (value instanceof Uint8Array) {
        out[index] = value;
    } else if (Array.isArray(value)) {
        out[index] = new Uint8Array(value);
    } else if (value === null) {
        out[index] = null;
    } else {
        assert(false, 'Unexpected value type');
    }
}

function outSize(startIndex: number, endIndex: number = -1) {
    if (endIndex < 0) {
        endIndex = out.length;
    }
    return out.slice(startIndex, endIndex).reduce((a, x) => a + x!.length, 0);
}


function leb128Size(x: number) {
    if (x < 128) return 1;
    if (x < 128 * 128) return 2;
    if (x < 128 * 128 * 128) return 3;
    if (x < 128 * 128 * 128 * 128) return 4;
    if (x < 128 * 128 * 128 * 128 * 128) return 5;
    return 6;
}

function leb128Create(x: number, exactBytes: number = -1000) {
    assert(x >= 0);
    assert(leb128Size(x) <= Math.abs(exactBytes));
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

enum SectionType {
    customSection = 0,
    typeSection = 1,
    importSection = 2,
    functionSection = 3,
    tableSection = 4,
    memorySection = 5,
    globalSection = 6,
    exportSection = 7,
    startSection = 8,
    elementSection = 9,
    codeSection = 10,
    dataSection = 11,
    dataCountSection = 12,
}

enum DataType {
    typeI32 = 0x7F,
    typeI64 = 0x7E,
    typeF32 = 0x7D,
    typeF64 = 0x7C,
}


function leb128(): number {

    let res = 0;
    let value: number;
    let bits = 0;
    do {
        value = bin[offset++];
        res |= (value & 0x7F) << bits;
        bits += 7;
    } while (value & 0x80);
    return res;
}

function parseTypeSection(sectionStart: number, sectionEnd: number) {

    getSpTypeIndex = -1;
    setSpTypeIndex = -1;

    let count = leb128();

    for (let i = 0; i < count; i++) {
        assert.equal(bin[offset++], 0x60, 'Function type prefix');
        let parametersCount = leb128();
        let param = bin[offset];
        offset += parametersCount;
        let resultsCount = leb128();
        let result = bin[offset];
        offset += resultsCount;
        if (parametersCount === 1 && resultsCount === 0 && param === DataType.typeI32) {
            setSpTypeIndex = i;
        }
        if (parametersCount === 0 && resultsCount === 1 && result === DataType.typeI32) {
            getSpTypeIndex = i;
        }
    }

    assert(getSpTypeIndex >= 0 && setSpTypeIndex >= 0);
}


function parseImportSection(sectionStart: number, sectionEnd: number) {

    let count = leb128();

    funcIndexStart = 0;
    globalIndexStart = 0;

    for (let i = 0; i < count; i++) {
        let len = leb128();
        offset += len;
        len = leb128();
        offset += len;
        let kind = bin[offset++];
        leb128();
        if (kind === 0x00) funcIndexStart++;
        if (kind === 0x03) globalIndexStart++;
        assert.notEqual(kind, 0x02, 'No import memory');
    }
}


function parseFunctionSection(sectionStart: number, sectionEnd: number) {

    output(bin.subarray(sectionStart, sectionStart + 1)); // id
    let sectionSizeBookmark = output(null); // section size
    let count = leb128();
    output(count + 2); // count
    output(bin.subarray(offset, sectionEnd)); // old functions
    offset = sectionEnd;
    output(getSpTypeIndex);
    output(setSpTypeIndex);
    getSpFuncIndex = count;
    setSpFuncIndex = count + 1;
    replace(sectionSizeBookmark, outSize(sectionSizeBookmark + 1));
}

function createFunction(bytecode: number[]) {
    let funcSizeOutBookmark = output(null); // function size
    output(0); // no locals
    output(bytecode); // code
    output([0x0B]); // END
    replace(funcSizeOutBookmark, outSize(funcSizeOutBookmark + 1));
}

function getName(name: string): Uint8Array {
    let x = new TextEncoder().encode(name);
    return new Uint8Array([x.length, ...x]);
}

function parseExportSection(sectionStart: number, sectionEnd: number) {
    output(SectionType.exportSection); // id
    let sectionSizeOutBookmark = output(null); // section size
    let count = leb128();
    stackPointerIndex = -1;
    output(count); // count
    let actual_count = 0;
    for (let i = 0; i < count; i++) {
        let start = offset;
        let len = leb128();
        let name = decoder.decode(bin.subarray(offset, offset + len));
        offset += len;
        let kind = bin[offset++];
        let index = leb128();
        let end = offset;
        if (name === '__stack_pointer') {
            stackPointerIndex = index;
            let offsets = globalsOffsets[stackPointerIndex - globalIndexStart];
            reshapeModuleParams.stackPointValueBegin = offsets.start;
            reshapeModuleParams.stackPointValueEnd = offsets.end;
        } else if (name === '_start') {
            // The "_start" function is not needed any more. It was already executed.
        } else {
            output(bin.subarray(start, end));
            actual_count++;
        }
    }
    output('getStackPointer');
    output(0x00);
    output(funcIndexStart + getSpFuncIndex);
    actual_count++;
    output('setStackPointer');
    output(0x00);
    output(funcIndexStart + setSpFuncIndex);
    actual_count++;
    assert.equal(actual_count, count);
    replace(sectionSizeOutBookmark, outSize(sectionSizeOutBookmark + 1));
    assert.equal(offset, sectionEnd);
    assert(stackPointerIndex >= 0);
}


function prepareDataBlocks(threshold: number): number {
    blocks = [];
    let zeroCount = 0;
    let dataStart = stackPointer;
    let zeroStart = stackPointer;
    for (let i = stackPointer; i < memory.length; i++) {
        let zero = memory[i] == 0;
        if (zero) {
            zeroCount++;
        } else {
            if (zeroCount >= threshold) {
                blocks.push({
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
        blocks.push({
            offset: dataStart,
            length: zeroStart - dataStart,
            zeros: 0,
        });
    }

    if (blocks[0].length === 0) {
        blocks.shift();
    }

    let size = 0;
    for (let block of blocks) {
        size += 3 + leb128Size(block.offset) + leb128Size(block.length) + block.length;
    }
    return size;
}

function parseDataSection(sectionStart: number, sectionEnd: number) {
    reshapeModuleParams.dataSectionBegin = outSize(0) + 1;

    let count = leb128();
    for (let i = 0; i < count; i++) {
        let kind = leb128();
        assert(kind === 0x00 || kind === 0x02, 'Data cannot be passive.');
        if (kind === 0x02) {
            let mem = leb128();
            assert.equal(mem, 0, 'Only memory 0 allowed.');
        }
        let instr = leb128();
        assert.equal(instr, 0x41, 'Only i32.const allowed.');
        leb128(); // offset
        let instrEnd = leb128();
        assert.equal(instrEnd, 0x0B, 'Only one instruction allowed.');
        let size = leb128();
        offset += size;
    }

    output(SectionType.dataSection);
    let sectionSizeBookmark = output(null);
    output(blocks.length);
    for (let block of blocks) {
        output([
            0x00, // kind: active, memory 0
            0x41, ...leb128Create(block.offset), // i32.const block.offset
            0x0B, // end
            ...leb128Create(block.length), // size
        ]);
        output(memory.subarray(block.offset, block.offset + block.length));
    }
    replace(sectionSizeBookmark, outSize(sectionSizeBookmark + 1));
    reshapeModuleParams.dataSectionEnd = outSize(0);
}

function parseDataCountSection(sectionStart: number, sectionEnd: number) {
    output(SectionType.dataCountSection);
    output(leb128Size(blocks.length));
    output(blocks.length);
    offset = sectionEnd;
}

function parseMemorySection(sectionStart: number, sectionEnd: number) {

    let count = leb128();
    assert.equal(count, 1, 'Exactly one memory.');
    offset++; // ignore limit kind
    let min = leb128();
    offset = sectionEnd;

    let expectedBlocks = Math.max(min, Math.ceil(memory.length / BLOCK_SIZE)) + MEM_PRE_ALLOC / BLOCK_SIZE;
    output(SectionType.memorySection);
    output(8); // size
    output(1); // memory count
    output(0x01); // upper limit present
    output(leb128Create(expectedBlocks, 3)),
    output(leb128Create(HARD_MEM_LIMIT / BLOCK_SIZE, 3)),
    reshapeModuleParams.memLimitsOffset = outSize(0) - 3 - 3;
}

function parseCodeSection(sectionStart: number, sectionEnd: number) {

    output(SectionType.codeSection); // id
    let sectionSizeOutBookmark = output(null); // section size
    let count = leb128();
    output(count + 2); // count
    output(bin.subarray(offset, sectionEnd)); // old functions
    offset = sectionEnd;
    createFunction([
        0x23, ...leb128Create(stackPointerIndex), // global.get
    ]);
    createFunction([
        0x20, ...leb128Create(0), // local.get 0
        0x24, ...leb128Create(stackPointerIndex), // global.set
    ]);
    replace(sectionSizeOutBookmark, outSize(sectionSizeOutBookmark + 1));
}

function parseGlobalSection(sectionStart: number, sectionEnd: number) {
    let outSectionStart = outSize(0);

    let count = leb128();
    globalsOffsets = [];

    for (let i = 0; i < count; i++) {
        offset++; // Type
        assert(bin[offset++] <= 0x01, 'Global type');
        let instr = bin[offset++];
        let start = offset;
        if (instr === 0x41 || instr === 0x42) {
            leb128();
        } else if (instr === 0x43) {
            offset += 4;
        } else if (instr === 0x44) {
            offset += 8;
        } else {
            assert(false, 'Unsupported instruction in global initialization value');
        }
        let end = offset;
        globalsOffsets.push({
            start: start - sectionStart + outSectionStart,
            end: end - sectionStart + outSectionStart,
        });
        assert.equal(bin[offset++], 0x0B, 'END instruction');
    }
}

export function appendCustomSection(moduleBin: Uint8Array): Uint8Array {

    out = [moduleBin];

    output(SectionType.customSection);
    output(1 + CUSTOM_SECTION_NAME.length + 7 * 4);
    output(CUSTOM_SECTION_NAME);

    let struct = new DataView(new ArrayBuffer(7 * 4));
    struct.setUint32(4 * 0, INTERFACE_VERSION, true);
    struct.setUint32(4 * 1, reshapeModuleParams.stackPointValueBegin, true);
    struct.setUint32(4 * 2, reshapeModuleParams.stackPointValueEnd, true);
    struct.setUint32(4 * 3, reshapeModuleParams.dataSectionBegin, true);
    struct.setUint32(4 * 4, reshapeModuleParams.dataSectionEnd, true);
    struct.setUint32(4 * 5, reshapeModuleParams.memLimitsOffset, true);
    struct.setUint32(4 * 6, CUSTOM_SECTION_MAGIC, true);

    output(new Uint8Array(struct.buffer));

    return getOutput();
}

function updateStackPointer() {
    let outputBinary = getOutput();
    out = [outputBinary];
    let bin = outputBinary.subarray(reshapeModuleParams.stackPointValueBegin, reshapeModuleParams.stackPointValueEnd);
    let sp = stackPointer;
    assert(bin.length >= leb128Size(stackPointer));
    for (let i = 0; i < bin.length; i++) {
        bin[i] = ((sp >> (7 * i)) & 0x7F) | 0x80;
    }
    bin[bin.length - 1] &= 0x7F;
}

function getOutput(): Uint8Array {
    let size = outSize(0);
    let res = new Uint8Array(size);
    let offset = 0;
    for (let chunk of out) {
        res.set(chunk as any, offset);
        offset += chunk!.length;
    }
    return res;
}
