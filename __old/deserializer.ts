
import { Callbacks } from './serializer';

class Deserializer implements Callbacks {
    private stack: any[] = [];
    private reuseTable: any[] = [];

    get(): any {
        return this.stack.at(-1);
    }

    createUndefined(): void {
        this.stack.push(undefined);
    }

    createNull(): void {
        this.stack.push(null);
    }

    createNumber(value: number): void {
        this.stack.push(value);
    }

    createBoolean(value: number): void {
        this.stack.push(value !== 0);
    }

    createBigInt(value: string): void {
        this.stack.push(BigInt(value));
    }

    createString(value: string): void {
        this.stack.push(value);
    }

    createError(value: string): void {
        let name = this.stack.pop();
        if (name) {
            value = name + ': ' + value;
        }
        let error = new Error(value);
        let stackTrace = this.stack.pop();
        if (stackTrace) {
            error.stack = stackTrace.toString();
        }
    }

    createArray(): void {
        this.stack.push([]);
    }

    createObject(): void {
        this.stack.push({});
    }

    createArrayItem(index: number): void {
        let array = this.stack.at(-2);
        if (!Array.isArray(array) || index < 0 || index > 0x7FFFFFFF) {
            throw new Error('Invalid stack state');
        }
        array[index] = this.stack.pop();
    }

    createObjectItem(name: string): void {
        let obj = this.stack.at(-2);
        if (typeof obj !== 'object') {
            throw new Error('Invalid stack state');
        }
        obj[name] = this.stack.pop();
    }

    createDate(time: number): void {
        this.stack.push(new Date(time));
    }

    createRegExp(lastIndex: number): void {
        let flags = this.stack.pop();
        let source = this.stack.pop();
        if (typeof source !== 'string' || typeof flags !== 'string') {
            throw new Error('Invalid stack state');
        }
        let regExp = new RegExp(source, flags);
        regExp.lastIndex = lastIndex;
        this.stack.push(regExp);
    }

    keepValue(): number {
        throw new Error('Method not implemented.');
    }

    reuseValue(handle: number): void {
        throw new Error('Method not implemented.');
    }

    clearValues(): void {
        throw new Error('Method not implemented.');
    }
    
}
