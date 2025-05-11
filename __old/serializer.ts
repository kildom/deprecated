
export interface Callbacks {
    createUndefined(): void;
    createNull(): void;
    createNumber(value: number): void;
    createBoolean(value: number): void;
    createBigInt(value: string): void;
    createString(value: string): void;
    createError(value: string): void;
    createArray(): void;
    createObject(): void;
    createArrayItem(index: number): void;
    createObjectItem(name: string): void;
    createDate(time: number): void;
    createRegExp(lastIndex: number): void;
    keepValue(): number;
    reuseValue(handle: number): void;
    clearValues(): void;
}

export function newSerializer(callbacks: Callbacks, sendStack: boolean = false) {

    let reusedMap = new Map<any, number>();

    function prepare(value: any) {
        let type = typeof value;

        if ((type === 'function' || type === 'object' || type === 'string') && value !== null) {

            let currentCount = reusedMap.get(value) ?? -3;
            currentCount++;
            if (currentCount < 0) {
                reusedMap.set(value, currentCount);
                if (currentCount === -1) {
                    return;
                }
            }

            if (Array.isArray(value)) {
                value.forEach(prepare);
            } else if ((value instanceof Date) || (value instanceof RegExp) || (value instanceof Error)) {
                // Ignore leaf objects
            } else if (type !== 'string') {
                for (let key in value) {
                    prepare(value[key]);
                }
            }
        }
    }

    function serialize(obj: any) {
        switch (typeof obj) {
            case 'number':
                callbacks.createNumber(obj);
                break;
            case 'boolean':
                callbacks.createBoolean(obj ? 1 : 0);
                break;
            case 'undefined':
                callbacks.createUndefined();
                break;
            case 'string': {
                let reuseHandle = reusedMap.get(obj)!;
                if (reuseHandle >= 0) {
                    callbacks.reuseValue(reuseHandle);
                } else {
                    callbacks.createString(obj);
                    if (reuseHandle === -1) {
                        reusedMap.set(obj, callbacks.keepValue())
                    }
                }
                break;
            }
            case 'bigint':
                callbacks.createBigInt(obj.toString());
                break;
            case 'object':
            case 'function': {
                if (obj === null) {
                    callbacks.createNull();
                    return;
                }
                if (obj instanceof Date) {
                    callbacks.createDate(obj.getTime());
                } else if (obj instanceof RegExp) {
                    serialize(obj.source);
                    serialize(obj.flags);
                    callbacks.createRegExp(obj.lastIndex);
                } else if (obj instanceof Error) {
                    serialize(sendStack ? obj.stack : undefined);
                    serialize(obj.name);
                    callbacks.createError(obj.toString());
                } else {
                    let reuseHandle = reusedMap.get(obj)!;
                    if (reuseHandle >= 0) {
                        callbacks.reuseValue(reuseHandle);
                    } else if (Array.isArray(obj)) {
                        callbacks.createArray();
                        if (reuseHandle === -1) {
                            reusedMap.set(obj, callbacks.keepValue());
                        }
                        for (let i in obj) {
                            serialize(obj[i]);
                            callbacks.createArrayItem(parseInt(i));
                        }
                    } else {
                        callbacks.createObject();
                        if (reuseHandle === -1) {
                            reusedMap.set(obj, callbacks.keepValue());
                        }
                        for (let i in obj) {
                            serialize(obj[i]);
                            callbacks.createObjectItem(i);
                        }
                    }
                }
                break;
            }
            case 'symbol':
                throw new Error('Symbol serialization is not allowed.');
            default:
                throw new Error('Unsupported type for serialization.');
        }
    }

    return function (value: any) {
        try {
            callbacks.clearValues();
            prepare(value);
            serialize(value);
        } finally {
            reusedMap.clear();
        }
    };

}
