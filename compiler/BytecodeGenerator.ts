


export class BytecodeGenerator {
    emitDebug() {
        console.log('Debug');
    }
    emitBranch(value?: string) {
        console.log('Branch', value);
    }
    newBlock() : BytecodeGenerator {
        return new BytecodeGenerator();
    }
    emitDup() {
        console.log('Dup');
    }
    emitBranchIfNullish(value?: string) {
        console.log('BranchIfNullish', value);
    }
    emitLabel(value: string) {
        console.log('Label', value);
    }
    newLabel() {
        let n = '' + Math.ceil(Math.random() * 1000000);
        console.log('. prepare label', n);
        return n;
    }
    constructor() {

    }

    emitPushString(value: string) {
        console.log('PushString', value);
    }
    emitPushBool(value: boolean) {
        console.log('PushBool', value);
    }
    emitGet() {
        console.log('Get');
    }

    emitAdd() {
        console.log('Add');
    }
    emitSpread() {
        console.log('Spread');
    }
    emitSwap() {
        console.log('Swap');
    }
    emitPushInt(i: number) {
        console.log('PushInt', i);
    }
    emitCall() {
        console.log('Call');
    }
    emitCallMember() {
        console.log('CallMember');
    }
    emitPop() {
        console.log('Pop');
    }

    emitPushRegExp(value: RegExp) {
        console.log('PushRegExp', value);
    }
    emitPushNull() {
        console.log('PushNull');
    }
    emitPushBitInt(value: bigint) {
        console.log('PushBitInt', value);
    }
    emitPushNumber(value: number) {
        if (Number.isInteger(value) && value >= -0x4000000 && value <= 0x3FFFFFF) {
            this.emitPushInt(value);
        } else {
            this.emitPushDouble(value);
        }
    }
    emitPushDouble(value: number) {
        console.log('PushDouble', value);
    }
}

