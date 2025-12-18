
import assert from 'assert';
import { exportInfoPrefix } from '../../src-common/common';

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

const PAGE_SIZE = 65536;
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

interface MemoryLimits {
    initialPages: number;
    maximumPages: number;
    begin: number;
    end: number;
}

//#region ------- Output Writing -------


function output(value: string | Uint8Array | number[] | null): number {
    let res = out.length;
    if (typeof value === 'string') {
        let b = encoder.encode(value);
        out.push(new Uint8Array([
            ...uLeb128Create(b.length),
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

function outputSigned(value: number): number {
    let res = out.length;
    out.push(sLeb128Create(value));
    return res;
}

function outputUnsigned(value: number): number {
    let res = out.length;
    out.push(uLeb128Create(value));
    return res;
}

function replace(index: number, value: string | Uint8Array | number[] | null): void {
    if (typeof value === 'string') {
        let b = encoder.encode(value);
        out[index] = new Uint8Array([
            ...uLeb128Create(b.length),
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


function replaceSigned(index: number, value: number): void {
    out[index] = sLeb128Create(value);
}


function replaceUnsigned(index: number, value: number): void {
    out[index] = uLeb128Create(value);
}


function outputOffset(startBookmark: number, endBookmark: number = -1) {
    if (endBookmark < 0) {
        endBookmark = out.length;
    }
    return out.slice(startBookmark, endBookmark).reduce((a, x) => a + x!.length, 0);
}

function leb128CreateCommon(x: number, exactBytes: number, funcSize: any) {
    assert(x >= 0);
    assert(funcSize(x) <= Math.abs(exactBytes));
    if (exactBytes < 0) {
        exactBytes = funcSize(x);
    }
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

function uLeb128Create(x: number, exactBytes: number = -1000) {
    return leb128CreateCommon(x, exactBytes, uLeb128Size);
}

function sLeb128Create(x: number, exactBytes: number = -1000) {
    return leb128CreateCommon(x, exactBytes, sLeb128Size);
}

function uLeb128Size(x: number) {
    assert(x >= 0);
    if (x < 128) return 1;
    if (x < 128 * 128) return 2;
    if (x < 128 * 128 * 128) return 3;
    if (x < 128 * 128 * 128 * 128) return 4;
    if (x < 128 * 128 * 128 * 128 * 128) return 5;
    return 6;
}

function sLeb128Size(x: number) {
    assert(x >= 0);
    if (x < 64) return 1;
    if (x < 64 * 128) return 2;
    if (x < 64 * 128 * 128) return 3;
    if (x < 64 * 128 * 128 * 128) return 4;
    if (x < 64 * 128 * 128 * 128 * 128) return 5;
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
        assert(id != SectionType.memorySection, 'Only imported memory allowed.');
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

    let startSecIndex = sectionsOrdered.findIndex(sec => sec.id === SectionType.startSection);
    if (startSecIndex >= 0) {
        sectionsOrdered.splice(startSecIndex, 1);
        delete sectionsById[SectionType.startSection];
    }

    let { getSpTypeIndex, setSpTypeIndex } =
        parseTypeSection();

    let { getSpFuncIndex, setSpFuncIndex } =
        addSpHandlersToFunctionSection({ getSpTypeIndex, setSpTypeIndex });

    let { funcIndexStart, globalIndexStart } =
        getIndexStartsAndMemoryFromImports({ memorySize: memory.length });

    let { stackPointerIndex } =
        addStackHandlersToExportAndGetSpIndex({ funcIndexStart, getSpFuncIndex, setSpFuncIndex, memorySize: memory.length });

    addStackHandlersCode({ stackPointerIndex });

    let { dataBlockCount } =
        generateNewDataSection(memory, stackPointer, sizeOptimize);

    generateDataCountSection(dataBlockCount);

    let { stackPointerBegin, stackPointerSize } =
        getStackPointerLocation({ stackPointerIndex, globalIndexStart });

    replaceStackPointer({ stackPointerBegin, stackPointerSize, stackPointer });

    return getOutput();
}

export function getImportMemoryLimits(binary: Uint8Array) {

    readSections(binary);

    let { memoryLimits } =
        getIndexStartsAndMemoryFromImports({ memorySize: 0 });

    return memoryLimits;
}


function getOutput(): Uint8Array {
    let size = 8;
    let headers: Uint8Array[] = []
    for (let section of sectionsOrdered) {
        let s = section.output.reduce((a, x) => a + x.length, 0);
        let sectionHeader = new Uint8Array([
            section.id,
            ...uLeb128Create(s),
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
    outputUnsigned(count + 2); // count
    output(bin.subarray(offset, currentSection.end)); // old functions
    outputUnsigned(getSpTypeIndex);
    outputUnsigned(setSpTypeIndex);
    let getSpFuncIndex = count;
    let setSpFuncIndex = count + 1;
    return { getSpFuncIndex, setSpFuncIndex };
}

function addStackHandlersToExportAndGetSpIndex({ funcIndexStart, getSpFuncIndex, setSpFuncIndex, memorySize }: { funcIndexStart: number, getSpFuncIndex: number, setSpFuncIndex: number, memorySize: number }) {
    setActive(SectionType.exportSection, true);

    let stackPointerIndex = -1;

    let count = leb128();
    outputUnsigned(count + 1); // count
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
    output('getStackPointer_old');
    outputUnsigned(0x00);
    outputUnsigned(funcIndexStart + getSpFuncIndex);
    actual_count++;
    output('setStackPointer_old');
    outputUnsigned(0x00);
    outputUnsigned(funcIndexStart + setSpFuncIndex);
    actual_count++;
    output(exportInfoPrefix + Math.ceil(memorySize / PAGE_SIZE).toString(16));
    outputUnsigned(0x00);
    outputUnsigned(funcIndexStart + getSpFuncIndex);
    actual_count++;
    assert(stackPointerIndex >= 0);
    assert.equal(actual_count, count + 1);

    return { stackPointerIndex };
}

function getIndexStartsAndMemoryFromImports({ memorySize }: { memorySize: number }) {
    setActive(SectionType.importSection, true);

    let funcIndexStart = 0;
    let globalIndexStart = 0;
    let memoryLimits = { initialPages: -1, maximumPages: -1, begin: -1, end: -1 };
    let count = leb128();
    outputUnsigned(count);
    for (let i = 0; i < count; i++) {
        let len = leb128();
        outputUnsigned(len);
        output(bin.subarray(offset, offset + len));
        offset += len;
        len = leb128();
        outputUnsigned(len);
        output(bin.subarray(offset, offset + len));
        offset += len;
        let kind = byte();
        outputUnsigned(kind);
        if (kind === 0x00) { // func
            outputUnsigned(leb128()); // index
            funcIndexStart++;
        }
        else if (kind === 0x03) { // global
            outputUnsigned(byte()); // type
            outputUnsigned(byte()); // mut
            globalIndexStart++;
        } else if (kind === 0x02) { // memory
            let maxPresent = byte();
            outputUnsigned(maxPresent);
            memoryLimits.begin = outputOffset(0);
            let moduleInitial = leb128();
            memoryLimits.initialPages = Math.max(moduleInitial, Math.ceil(memorySize / PAGE_SIZE));
            output(uLeb128Create(memoryLimits.initialPages, 3));
            memoryLimits.end = outputOffset(0);
            if (maxPresent) {
                memoryLimits.maximumPages = leb128();
                outputUnsigned(memoryLimits.maximumPages);
            } else {
                memoryLimits.maximumPages = Infinity;
            }
        } else { // table
            assert(false);
        }
    }

    assert(memoryLimits.initialPages > 0);
    assert(memoryLimits.maximumPages > 0);
    assert(memoryLimits.begin > 0);
    assert(memoryLimits.end > 0);

    return { funcIndexStart, globalIndexStart, memoryLimits };
}


function createCode(bytecode: number[]) {
    let funcSizeOutBookmark = output(null); // function size
    outputUnsigned(0); // no locals
    output(bytecode); // code
    output([0x0B]); // END
    replaceUnsigned(funcSizeOutBookmark, outputOffset(funcSizeOutBookmark + 1));
}


function addStackHandlersCode({ stackPointerIndex }: { stackPointerIndex: number }): void {
    setActive(SectionType.codeSection, true);

    let count = leb128();
    outputUnsigned(count + 2); // count
    output(bin.subarray(offset, currentSection.end)); // old functions
    createCode([
        0x23, ...uLeb128Create(stackPointerIndex), // global.get
    ]);
    createCode([
        0x20, ...uLeb128Create(0), // local.get 0
        0x24, ...uLeb128Create(stackPointerIndex), // global.set
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
        size += 3 + sLeb128Size(block.offset) + uLeb128Size(block.length) + block.length;
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

    outputUnsigned(blocks.length);
    for (let block of blocks) {
        output([
            0x00, // kind: active, memory 0
            0x41, ...sLeb128Create(block.offset), // i32.const block.offset
            0x0B, // end
            ...uLeb128Create(block.length), // size
        ]);
        output(memory.subarray(block.offset, block.offset + block.length));
    }
    return { dataBlockCount: blocks.length };
}

function generateDataCountSection(dataBlockCount: number) {
    if (sectionsById[SectionType.dataCountSection]) {
        setActive(SectionType.dataCountSection, true);
        outputUnsigned(dataBlockCount);
    }
}


function setActive(type: SectionType | Section, clearOutput: boolean = false): void {
    currentSection = typeof type === 'object' ? type : sectionsById[type];
    if (!currentSection) {
        throw new assert.AssertionError({ message: `Expected section ${SectionType[type as any]} is missing.` });
    }
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
    let stackPointerSize = -1;

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
            stackPointerSize = end - start;
        }
        assert.equal(byte(), 0x0B, 'END instruction');
    }

    assert(stackPointerBegin > 0 && stackPointerSize > 0);

    return { stackPointerBegin, stackPointerSize };
}

function replaceStackPointer({ stackPointerBegin, stackPointerSize, stackPointer }: { stackPointerBegin: number, stackPointerSize: number, stackPointer: number }) {
    setActive(SectionType.globalSection);
    commitSectionOutput();
    currentSection.input.subarray(stackPointerBegin, stackPointerBegin + stackPointerSize).set(sLeb128Create(stackPointer, stackPointerSize));
}
