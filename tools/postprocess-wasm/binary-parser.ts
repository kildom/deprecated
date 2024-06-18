
import assert from 'assert';

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

interface Section {
    id: number;
    begin: number;
    end: number;
    input: Uint8Array;
    output: Uint8Array[];
    outputOffset: number;
    outputEndOffset: number;
    outputHeaderSize: number;
}

const INTERFACE_VERSION = 0;
const CUSTOM_SECTION_NAME = 'js-sandbox-CpktVgXbZaAHZ1ADnsj7I';
const HARD_MEM_LIMIT = 512 * 1024 * 1024;
const BLOCK_SIZE = 65536;
const SPEED_OPTIMIZE_HOLE_SIZE_THRESHOLD = 16;

const encoder = new TextEncoder();
const decoder = new TextDecoder()

const sectionsOrdered: Section[] = [];
const sectionsById: Section[] = [];

let offset: number;
let bin: Uint8Array;
let out: (Uint8Array | null)[] = [];
let currentSection: Section;

interface DataBlock {
    offset: number;
    length: number;
    zeros: number;
}


//#region ------- Output Writing -------


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

function outputOffset(startBookmark: number, endBookmark: number = -1) {
    if (endBookmark < 0) {
        endBookmark = out.length;
    }
    return out.slice(startBookmark, endBookmark).reduce((a, x) => a + x!.length, 0);
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

function leb128Size(x: number) {
    if (x < 128) return 1;
    if (x < 128 * 128) return 2;
    if (x < 128 * 128 * 128) return 3;
    if (x < 128 * 128 * 128 * 128) return 4;
    if (x < 128 * 128 * 128 * 128 * 128) return 5;
    return 6;
}


//#endregion


//#region ------- Reading -------


function leb128(): number {

    let res = 0;
    let value: number;
    let bits = 0;
    do {
        value = byte();
        res |= (value & 0x7F) << bits;
        bits += 7;
    } while (value & 0x80);
    return res;
}

function byte(): number {
    return bin[offset++];
}

//#endregion


function readSections(binary: Uint8Array) {

    bin = binary;
    sectionsOrdered.splice(0);
    sectionsById.splice(0);

    offset = 8; // skip header and version

    while (offset < bin.length) {
        let id = byte();
        let size = leb128();
        let input = bin.subarray(offset, offset + size);
        offset += size;
        let section: Section = {
            id,
            begin: offset,
            end: offset + size,
            input,
            output: [input],
            outputOffset: 0,
            outputEndOffset: 0,
            outputHeaderSize: 0,
        };
        sectionsOrdered.push(section);
        if (id != 0) {
            sectionsById[id] = section;
        }
    }
}


export function rewriteModule(binary: Uint8Array, memory: Uint8Array, stackPointer: number, sizeOptimize: boolean) {

    readSections(binary);

    let { getSpTypeIndex, setSpTypeIndex } =
        parseTypeSection();

    let { getSpFuncIndex, setSpFuncIndex } =
        addSpHandlersToFunctionSection({ getSpTypeIndex, setSpTypeIndex });

    let { funcIndexStart, globalIndexStart } =
        getIndexStartsFromImports();

    let { stackPointerIndex } =
        addStackHandlersToExportAndGetSpIndex({ funcIndexStart, getSpFuncIndex, setSpFuncIndex });

    addStackHandlersCode({ stackPointerIndex });

    let { dataBlockCount } =
        generateNewDataSection(memory, stackPointer, sizeOptimize);

    generateDataCountSection(dataBlockCount);

    generateMemorySection({ minMemorySize: memory.length });

    let { stackPointerBegin, stackPointerEnd } =
        getStackPointerLocation({ stackPointerIndex, globalIndexStart });

    replaceStackPointer({ stackPointerBegin, stackPointerEnd, stackPointer });

    return getOutput();
}

export function parseModule(binary: Uint8Array) {

    readSections(binary);

    let { funcIndexStart, globalIndexStart } =
        getIndexStartsFromImports();

    let { stackPointerHandlerIndex } =
        getSpHandlerIndexFromExports();

    let { stackPointerIndex } =
        getSpIndexFromHandlerCode({ stackPointerHandlerIndex, funcIndexStart });

    let { stackPointerBegin, stackPointerEnd } =
        getStackPointerLocation({ stackPointerIndex, globalIndexStart });

    let { memoryLimitsOffset } =
        generateMemorySection({ minMemorySize: 0 });

    getOutput();

    stackPointerBegin += sectionsById[SectionType.globalSection].outputOffset + sectionsById[SectionType.globalSection].outputHeaderSize;
    stackPointerEnd += sectionsById[SectionType.globalSection].outputOffset + sectionsById[SectionType.globalSection].outputHeaderSize;
    memoryLimitsOffset += sectionsById[SectionType.memorySection].outputOffset + sectionsById[SectionType.memorySection].outputHeaderSize;
    let dataSectionBegin = sectionsById[SectionType.dataSection].outputOffset;
    let dataSectionEnd = sectionsById[SectionType.dataSection].outputEndOffset;

    appendCustomSection({ stackPointerBegin, stackPointerEnd, memoryLimitsOffset, dataSectionBegin, dataSectionEnd });

    return getOutput();
}


function appendCustomSection(
    { stackPointerBegin, stackPointerEnd, memoryLimitsOffset, dataSectionBegin, dataSectionEnd }:
        { stackPointerBegin: number, stackPointerEnd: number, memoryLimitsOffset: number, dataSectionBegin: number, dataSectionEnd: number }
) {
    let section: Section = {
        begin: NaN,
        end: NaN,
        id: SectionType.customSection,
        input: undefined as any,
        output: [],
        outputEndOffset: 0,
        outputHeaderSize: 0,
        outputOffset: 0,
    };

    sectionsOrdered.push(section);
    setActive(section, true);

    output(CUSTOM_SECTION_NAME);

    let struct = new DataView(new ArrayBuffer(6 * 4));
    struct.setUint32(4 * 0, INTERFACE_VERSION, true);
    struct.setUint32(4 * 1, stackPointerBegin, true);
    struct.setUint32(4 * 2, stackPointerEnd, true);
    struct.setUint32(4 * 3, dataSectionBegin, true);
    struct.setUint32(4 * 4, dataSectionEnd, true);
    struct.setUint32(4 * 5, memoryLimitsOffset, true);

    output(new Uint8Array(struct.buffer));
}


function getOutput(): Uint8Array {
    let size = 8;
    let headers: Uint8Array[] = []
    for (let section of sectionsOrdered) {
        let s = section.output.reduce((a, x) => a + x.length, 0);
        let sectionHeader = new Uint8Array([
            section.id,
            ...leb128Create(s),
        ]);
        headers.push(sectionHeader);
        size += sectionHeader.length + s;
    }
    let res = new Uint8Array(size);
    res.set(new Uint8Array([0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00]));
    let offset = 8;
    for (let section of sectionsOrdered) {
        let sectionHeader = headers.shift() as Uint8Array;
        section.outputOffset = offset;
        section.outputHeaderSize = sectionHeader.length;
        for (let chunk of [sectionHeader, ...section.output]) {
            res.set(chunk, offset);
            offset += chunk.length;
        }
        section.outputEndOffset = offset;
    }
    return res;
}

function commitSectionOutput() {

    let size = currentSection.output.reduce((a, x) => a + x.length, 0);
    currentSection.input = new Uint8Array(size);
    let offset = 0;
    for (let chunk of currentSection.output) {
        currentSection.input.set(chunk, offset);
        offset += chunk.length;
    }
    currentSection.output = [currentSection.input];
}

function getSpHandlerIndexFromExports() {
    setActive(SectionType.exportSection);

    let stackPointerHandlerIndex = -1;

    let count = leb128();
    for (let i = 0; i < count; i++) {
        let strLen = leb128();
        let name = decoder.decode(bin.subarray(offset, offset + strLen));
        offset += strLen;
        let kind = byte();
        let index = leb128();
        if (name === 'getStackPointer') {
            stackPointerHandlerIndex = index;
        }
    }

    assert(stackPointerHandlerIndex >= 0);

    return { stackPointerHandlerIndex };
}

function getSpIndexFromHandlerCode({ stackPointerHandlerIndex, funcIndexStart }: { stackPointerHandlerIndex: number, funcIndexStart: number }) {
    setActive(SectionType.codeSection);

    let index = stackPointerHandlerIndex - funcIndexStart;

    let stackPointerIndex = -1;

    let count = leb128();
    assert(index < count);

    for (let i = 0; i < index; i++) {
        let size = leb128();
        offset += size;
    }

    let size = leb128();
    let locals = leb128();
    assert.equal(locals, 0);
    let instr = byte();
    assert.equal(instr, 0x23); // global.get
    stackPointerIndex = leb128();
    instr = byte();
    assert.equal(instr, 0x0B); // end

    return { stackPointerIndex };
}


function parseTypeSection() {
    setActive(SectionType.typeSection);

    let getSpTypeIndex = -1;
    let setSpTypeIndex = -1;

    let count = leb128();

    for (let i = 0; i < count; i++) {
        assert.equal(byte(), 0x60, 'Function type prefix');
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

    return { getSpTypeIndex, setSpTypeIndex };
}

function addSpHandlersToFunctionSection({ getSpTypeIndex, setSpTypeIndex }: { getSpTypeIndex: number, setSpTypeIndex: number }) {
    setActive(SectionType.functionSection, true);

    let count = leb128();
    output(count + 2); // count
    output(bin.subarray(offset, currentSection.end)); // old functions
    output(getSpTypeIndex);
    output(setSpTypeIndex);
    let getSpFuncIndex = count;
    let setSpFuncIndex = count + 1;
    return { getSpFuncIndex, setSpFuncIndex };
}

function addStackHandlersToExportAndGetSpIndex({ funcIndexStart, getSpFuncIndex, setSpFuncIndex }: { funcIndexStart: number, getSpFuncIndex: number, setSpFuncIndex: number }) {
    setActive(SectionType.exportSection, true);

    let stackPointerIndex = -1;

    let count = leb128();
    output(count); // count
    let actual_count = 0;
    for (let i = 0; i < count; i++) {
        let start = offset;
        let strLen = leb128();
        let name = decoder.decode(bin.subarray(offset, offset + strLen));
        offset += strLen;
        let kind = byte();
        let index = leb128();
        if (name === '__stack_pointer') {
            stackPointerIndex = index;
        } else if (name === '_start') {
            // The "_start" function is not needed any more. It was already executed.
        } else {
            output(bin.subarray(start, offset));
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
    assert(stackPointerIndex >= 0);
    assert.equal(actual_count, count);

    return { stackPointerIndex };
}

function getIndexStartsFromImports() {
    setActive(SectionType.importSection);

    let funcIndexStart = 0;
    let globalIndexStart = 0;
    let count = leb128();
    for (let i = 0; i < count; i++) {
        let len = leb128();
        offset += len;
        len = leb128();
        offset += len;
        let kind = byte();
        leb128();
        if (kind === 0x00) funcIndexStart++;
        if (kind === 0x03) globalIndexStart++;
        assert.notEqual(kind, 0x02, 'No import memory');
    }

    return { funcIndexStart, globalIndexStart };
}


function createCode(bytecode: number[]) {
    let funcSizeOutBookmark = output(null); // function size
    output(0); // no locals
    output(bytecode); // code
    output([0x0B]); // END
    replace(funcSizeOutBookmark, outputOffset(funcSizeOutBookmark + 1));
}


function addStackHandlersCode({ stackPointerIndex }: { stackPointerIndex: number }): void {
    setActive(SectionType.codeSection, true);

    let count = leb128();
    output(count + 2); // count
    output(bin.subarray(offset, currentSection.end)); // old functions
    createCode([
        0x23, ...leb128Create(stackPointerIndex), // global.get
    ]);
    createCode([
        0x20, ...leb128Create(0), // local.get 0
        0x24, ...leb128Create(stackPointerIndex), // global.set
    ]);
}


function prepareDataBlocksForThreshold(blocks: DataBlock[], memory: Uint8Array, stackPointer: number, threshold: number): number {
    blocks.splice(0);
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


function prepareDataBlocks(memory: Uint8Array, stackPointer: number, sizeOptimize: boolean): DataBlock[] {
    let blocks: DataBlock[] = [];

    let bestThreshold = Infinity;

    if (sizeOptimize) {
        let bestSize = Infinity;
        for (let i = 6; i <= SPEED_OPTIMIZE_HOLE_SIZE_THRESHOLD; i++) {
            let size = prepareDataBlocksForThreshold(blocks, memory, stackPointer, i);
            if (size <= bestSize) {
                bestSize = size;
                bestThreshold = i;
            }
        }
    } else {
        bestThreshold = SPEED_OPTIMIZE_HOLE_SIZE_THRESHOLD;
    }

    prepareDataBlocksForThreshold(blocks, memory, stackPointer, bestThreshold);
    return blocks;
}


function generateNewDataSection(memory: Uint8Array, stackPointer: number, sizeOptimize: boolean) {
    setActive(SectionType.dataSection, true);

    // Just verification
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

    let blocks = prepareDataBlocks(memory, stackPointer, sizeOptimize);

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
    return { dataBlockCount: blocks.length };
}

function generateDataCountSection(dataBlockCount: number) {
    setActive(SectionType.dataCountSection, true);
    output(dataBlockCount);
}


function generateMemorySection({ minMemorySize }: { minMemorySize: number }) {
    setActive(SectionType.memorySection, true);

    let count = leb128();
    assert.equal(count, 1, 'Exactly one memory.');
    byte(); // ignore limit kind
    let min = leb128();

    let expectedBlocks = Math.max(min, Math.ceil(minMemorySize / BLOCK_SIZE));
    output(1); // memory count
    output(0x01); // upper limit present
    output(leb128Create(expectedBlocks, 3));
    output(leb128Create(HARD_MEM_LIMIT / BLOCK_SIZE, 3));
    let memoryLimitsOffset = 2;
    return { memoryLimitsOffset };
}


function setActive(type: SectionType | Section, clearOutput: boolean = false): void {
    currentSection = typeof type === 'object' ? type : sectionsById[type];
    assert(currentSection);
    bin = currentSection.input;
    offset = 0;
    out = currentSection.output;
    if (clearOutput) {
        out.splice(0);
    }
}

function getStackPointerLocation({ stackPointerIndex, globalIndexStart }: { stackPointerIndex: number, globalIndexStart: number }) {
    setActive(SectionType.globalSection);
    commitSectionOutput();

    let stackPointerBegin = -1;
    let stackPointerEnd = -1;

    let count = leb128();

    for (let i = 0; i < count; i++) {
        byte(); // Type
        assert(byte() <= 0x01, 'Global mutable or not');
        let instr = byte();
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
        if (globalIndexStart + i === stackPointerIndex) {
            stackPointerBegin = start;
            stackPointerEnd = end;
        }
        assert.equal(byte(), 0x0B, 'END instruction');
    }

    assert(stackPointerBegin > 0 && stackPointerEnd > 0);

    return { stackPointerBegin, stackPointerEnd };
}

function replaceStackPointer({ stackPointerBegin, stackPointerEnd, stackPointer }: { stackPointerBegin: number, stackPointerEnd: number, stackPointer: number }) {
    setActive(SectionType.globalSection);
    commitSectionOutput();
    currentSection.input.subarray(stackPointerBegin, stackPointerEnd).set(leb128Create(stackPointer, stackPointerEnd - stackPointerBegin));
}
