import { RegisterMessage, MessageObject } from './incoming-registry';

type GroupObject = { [key: string]: GroupNode };
type GroupNode = Function | GroupObject;


interface Group {
    root: GroupObject;
    size: number;
    serialized: string;
}

interface MemoryStats {
    objects: number;
    wrapperFunctions: number;
}


export class OutgoingRegistry {

    private groups: Group[] = [];

    public onCall?: (groupId: number, functionId: number, args: any[]) => any;
    public onSizeCalculate?: (objects: number, wrapperFunctions: number, stringLength: number) => number;
    public onSizeCheck?: (sizeDifference: number) => void;
    public onSizeCommit?: (sizeDifference: number) => void;

    public constructor(
        private enableSerialization: boolean
    ) { }

    public register(message: RegisterMessage): void {

        if (typeof message.groupId !== 'number') {
            throw new Error('The groupId is not a number.');
        }

        if (!message.message) {
            this.onSizeCommit?.(-(this.groups[message.groupId]?.size || 0));
            delete this.groups[message.groupId];
        } else {
            let serialized = this.enableSerialization ? JSON.stringify(message.message) : '';
            let newSize = 0;
            if (this.onSizeCalculate) {
                let stats: MemoryStats = { objects: 0, wrapperFunctions: 0 };
                this.countItems(stats, message.message);
                newSize = this.onSizeCalculate(stats.objects, stats.wrapperFunctions, serialized.length);
                let oldSize = this.groups[message.groupId]?.size || 0;
                this.onSizeCheck?.(newSize - oldSize);
            }
            let group: Group;
            if (this.groups[message.groupId]) {
                group = this.groups[message.groupId];
                for (let name of [...Object.keys(group.root)]) {
                    delete group.root[name];
                }
                group.serialized = '{}';
            } else {
                group = {
                    root: {},
                    size: 0,
                    serialized: '{}',
                };
                this.groups[message.groupId] = group;
            }
            this.onSizeCommit?.(newSize - group.size);
            this.createGroupObject(group.root, message.groupId, message.message);
            group.serialized = serialized;
            group.size = newSize;
        }
    }

    private createGroupObject(destination: GroupObject, groupId: number, message: MessageObject) {
        if (typeof message !== 'object') {
            throw new Error('The message is not an object.');
        }
        for (let [name, node] of Object.entries(message)) {
            if (typeof node === 'number') {
                destination[name] = this.createWrapper(groupId, node);
            } else {
                destination[name] = {};
                this.createGroupObject(destination[name], groupId, node);
            }
        }
    }

    private createWrapper(groupId: number, functionId: number): Function {
        let result = (...args: any[]) => {
            return this.onCall?.(groupId, functionId, args);
        };
        (result as any)._functionId = functionId;
        return result;
    }

    private countItems(stats: MemoryStats, message: MessageObject) {
        stats.objects++;
        for (let [name, child] of Object.entries(message)) {
            if (typeof child === 'object') {
                this.countItems(stats, child);
            } else {
                stats.wrapperFunctions++;
            }
        }
    }

    public get(groupId: number): any {
        return this.groups[groupId]?.root;
    }

    public set(groupId: number, object: any): void {
        for (let name of [...Object.keys(object)]) {
            delete object[name];
        }
        if (this.groups[groupId]) {
            let group = this.groups[groupId];
            for (let name of Object.keys(group)) {
                object[name] = group[name];
            }
            for (let name of [...Object.keys(group)]) {
                delete group[name];
            }
            this.groups[groupId].root = object;
        } else {
            this.groups[groupId] = {
                root: object,
                size: this.onSizeCalculate?.(1, 0, 2) || 0,
                serialized: '{}',
            }
        }
    }

    public store(): any {
        let result: string[] = [];
        for (let name in this.groups) {
            let groupId = parseInt(name);
            result[groupId] = this.groups[groupId].serialized;
        }
        return result;
    }

    public load(storage: any) {
        for (let name in (storage as string[])) {
            let groupId = parseInt(name);
            let message: RegisterMessage = {
                groupId,
                message: JSON.parse(storage[groupId]),
            };
            this.register(message);
        }
    }
}


function test1() {
    let registry = new OutgoingRegistry(true);
    registry.onCall = (groupId, functionId, args) => {
        console.log('onCall', groupId, functionId, args);
        return `onCall result ${groupId} ${functionId} (${args})`;
    };
    registry.onSizeCalculate = (objects, wrapperFunctions) => {
        console.log('onSizeCalculate', objects, wrapperFunctions);
        return objects + wrapperFunctions;
    };
    registry.onSizeCheck = (sizeDifference) => {
        console.log('onSizeCheck', sizeDifference);
    };
    registry.onSizeCommit = (sizeDifference) => {
        console.log('onSizeCommit', sizeDifference);
    };

    let imports = ((groupId: number) => {
        return registry.get(groupId);
    }) as any;

    registry.set(0, imports);

    let message: RegisterMessage = {
        groupId: 0,
        message: {
            a: 1,
            b: {
                c: 2,
                d: 3,
            },
            e: 4,
        },
    };

    registry.register(message);
    message.groupId = 2;
    registry.register(message);

    console.log(registry.get(0));
    console.log(registry.get(2));

    console.log(imports.a());
    console.log(imports(2).b.d('test'));
    let saved = registry.store();
    console.log(saved);
    let registry2 = new OutgoingRegistry(true);
    registry2.onCall = (groupId, functionId, args) => {
        console.log('onCall from reg2', groupId, functionId, args);
        return `onCall from reg2 result ${groupId} ${functionId} (${args})`;
    };
    registry2.load(saved);
    console.log(registry2.get(2).b.d('test'));
    console.log(registry2.store());
}

//test1();
