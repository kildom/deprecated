

export type RegisterObject = { [key: string]: RegisterNode };
export type RegisterNode = RegisterObject | Function | null;


class FunctionInfo {
    public constructor(
        public funcObject: Function,
        public thisObject: any,
        public functionId: number = 0,
    ) { }

    clone(): FunctionInfo {
        return new FunctionInfo(this.funcObject, this.thisObject, this.functionId);
    }
}

type GroupObject = { [key: string]: GroupNode };
type GroupNode = FunctionInfo | GroupObject;

export type MessageObject = { [key: string]: MessageNode };
export type MessageNode = number | MessageObject;


export interface RegisterMessage {
    groupId: number;
    message: MessageObject | null;
};

interface Group {
    root: GroupObject;
    functionById: FunctionInfo[];
}


export class IncomingRegistry {

    private groups: Group[] = [];

    public register(functions: RegisterObject | null, groupId?: number): RegisterMessage {
        if (groupId === undefined) {
            groupId = this.groups.findIndex(x => x === undefined);
            if (groupId < 0) {
                groupId = this.groups.length;
            }
        }
        if (!functions) {
            delete this.groups[groupId];
            return { groupId: groupId, message: null };
        } else {
            if (!this.groups[groupId]) {
                this.groups[groupId] = { root: {}, functionById: [] };
            }
            this.mergeObject(this.groups[groupId].root, functions);
            this.groups[groupId].functionById = [];
            let message = this.createMessageAndAssignIds(this.groups[groupId].functionById, this.groups[groupId].root);
            return { groupId: groupId, message };
        }
    }

    private createMessageAndAssignIds(callbackById: FunctionInfo[], node: GroupObject): MessageObject {
        let message: MessageObject = {};
        for (let [name, child] of Object.entries(node)) {
            if (child instanceof FunctionInfo) {
                child.functionId = callbackById.length;
                callbackById.push(child);
                message[name] = child.functionId;
            } else {
                message[name] = this.createMessageAndAssignIds(callbackById, child);
            }
        }
        return message;
    }

    private mergeObject(node: GroupObject, callbacks: RegisterObject) {
        for (let [name, callback] of Object.entries(callbacks)) {
            if (!callback) {
                delete node[name];
            } else if (typeof callback === 'function') {
                node[name] = new FunctionInfo(callback, callbacks);
            } else if (typeof callback === 'object') {
                if (!node[name] || node[name] instanceof FunctionInfo) {
                    node[name] = {};
                }
                this.mergeObject(node[name] as Exclude<GroupNode, FunctionInfo>, callback);
            }
        }
    }

    public execute(groupId: number, functionId: number, args?: any): any {

        if (!Array.isArray(args)) {
            if (!args) {
                args = [];
            } else {
                throw new Error('Invalid argument type. Expected an array.');
            }
        }

        if (typeof groupId !== 'number' || typeof functionId !== 'number'
            || !this.groups[groupId] || !this.groups[groupId].functionById[functionId]
        ) {
            throw new Error(`Callback with handle ${groupId} and id ${functionId} not found in registry.`);
        }

        let functionInfo = this.groups[groupId].functionById[functionId];
        globalThis.debug?.push({n:'execute', groupId, functionId, args, all:this.groups, functionInfo, typ: typeof functionInfo.funcObject, app: typeof functionInfo.funcObject.apply});
        return functionInfo.funcObject.apply(functionInfo.thisObject, args);
    }

    public clone(): IncomingRegistry {
        let clone = new IncomingRegistry();
        for (let i in this.groups) {
            let group = this.groups[i];
            let functionById = group.functionById.map(info => info.clone());
            clone.groups[i] = {
                functionById,
                root: this.cloneGroupObject(group.root, functionById),
            };
        }
        return clone;
    }

    private cloneGroupObject(source: GroupObject, functionById: FunctionInfo[]): GroupObject {
        let result: GroupObject = {};
        for (let [name, value] of Object.entries(source)) {
            if (value instanceof FunctionInfo) {
                result[name] = functionById[value.functionId];
            } else {
                result[name] = this.cloneGroupObject(value, functionById);
            }
        }
        return result;
    }
}

function test1() {
    let registry = new IncomingRegistry();

    let message = registry.register({
        test: function (a: number, b: number) {
            return a + b;
        },
        other: () => { },
    });

    console.log(message);
    console.log(registry.execute(message.groupId, (message as any).message.test, [1, 2]));

    let registry2 = registry.clone();

    console.log(registry2.execute(message.groupId, (message as any).message.test, [1, 2]));
}

//test1();
