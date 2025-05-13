import bootSource from "../build/guest/boot";
import { exportInfoPrefix } from "../src-common/common";
import { deserialize } from "../src-common/deserializer";
import { IncomingRegistry } from "../src-common/incoming-registry";
import { OutgoingRegistry } from "../src-common/outgoing-registry";
import { serialize } from "../src-common/serializer";
import * as wr from "../src-wasm/wrapper/wrapper";

export const GuestError = wr.GuestError;
export const EngineError = wr.EngineError;
export const HostError = wr.HostError;
export const LogLevel = wr.LogLevel;


export interface InstantiateOptions {
    maxHeapSize?: number; // default: min((maxWasmSize - estimated static data size) * 0.xx {fragmentation coefficient}, minHeapThreshold * 1.xx)
    maxWasmSize?: number; // default: maxHeapSize ? maxHeapSize * 1.xx + estimated static data size : 32 * 1024 * 1024
    minHeapThreshold?: number; // default: maxHeapSize * 0.xx // TODO: minHeapThreshold
    maxMessageEstimatedSize?: number; // default: 1 * 1024 * 1024 // TODO: Estimated memory size allocated by the data flowing from guest to host.
    maxCallRecursion?: number; // default: 10 // TODO: maximum number of calls between host and guest in one call stack.
    // Documentation should explain that recursion should be avoided, something like:
    // "Don't call guest from host function that might be called from guest."
    module?: ModuleSourceType;
};


interface ValidatedInstantiateOptions extends InstantiateOptions {
    maxHeapSize: number;
    maxWasmSize: number;
    minHeapThreshold: number;
    maxMessageEstimatedSize: number;
    maxCallRecursion: number;
}


export interface ExecuteOptions {
    fileName?: string;
    asModule?: boolean;
    returnValue?: boolean;
    args?: any;
};

export type Storage = Record<symbol, any>;
export type RegisterCallbacks = { [key: string]: Function & RegisterCallbacks };
export type ExportsCallbacks = { readonly [key: string]: Function & RegisterCallbacks };


export interface SnapshotCallbacks {
    beforeTakeSnapshot?: (sandbox: Sandbox) => void;
    afterTakeSnapshot?: (sandbox: Sandbox, snapshot: Snapshot) => void;
    instantiateSnapshot?: (sandbox: Sandbox, snapshot: Snapshot) => void;
};

export type Bytecode = wr.CompileResult;

/**
 * Represents an isolated environment for executing JavaScript code.
 */
export interface Sandbox {
    /**
     * Executes the given code inside sandbox.
     * 
     * @param code - The code string to execute.
     * @param options - Optional execution options.
     * @returns The result of the code execution if `options.returnValue` is true, `undefined` otherwise.
     */
    execute(code: Bytecode): any;
    execute(code: string, options?: ExecuteOptions): any;

    compile(code: string, options?: ExecuteOptions): Bytecode;

    /**
     * Registers callbacks that are available in the guest as imports.
     * 
     * The callback are passed the the guest and they are available there using `__sandbox__.imports(<handle>)`,
     * where `<handle>` is the number returned by this function.
     * Only functions can be imported. If you want to pass some data, create a wrapper function.
     * 
     * You can update already registered import by providing `handle` parameter.
     * Callbacks are merge with the guest object.
     * The deep merging is used, so nested objects are also merged.
     * If you want to deregister function or entire object, you can use `null` as value.
     * 
     * Special `handle` value `0` is used to register the default imports that are available
     * in the guest from `__sandbox__.imports` object. There is no need to pass handle in this case,
     * for example `__sandbox__.imports.myImportedFunction()`.
     * 
     * When a snapshot is taken, the registered callbacks are also stored in the snapshot.
     * Use `registerSnapshotCallbacks` if you need some special behavior during snapshot creation or instantiation.
     * 
     * @param callbacks - The callbacks to register for handling imports.
     * @param handle - An optional handle, if you want to modify already registered imports. `0` is used to update default imports.
     * @returns A unique handle identifying the registered imports.
     */
    imports(callbacks: RegisterCallbacks, handle?: number): number;

    /**
     * Provides access to the guest's exports.
     * 
     * They are registered in the guest with the `__sandbox__.exports(<callbacks>, <handle>)` function.
     */
    exports: ExportsCallbacks & ((handle: number) => ExportsCallbacks);

    /**
     * Registers callbacks to be triggered during snapshot operations.
     * 
     * When a snapshot is taken:
     * - All the `beforeTakeSnapshot` callbacks are executed the opposite order as they are added.
     * - All the `afterTakeSnapshot` callbacks are executed the opposite order as they are added.
     * 
     * When a snapshot is instantiated:
     * - All the `instantiateSnapshot` callbacks are executed the order as they are added.
     * 
     * @param callbacks - The snapshot-related callbacks to added.
     */
    addSnapshotCallbacks(callbacks: SnapshotCallbacks): void;

    /**
     * Creates a snapshot of the current state of the sandbox.
     * 
     * @returns A snapshot representing the sandbox's state at the time of invocation.
     */
    takeSnapshot(): Snapshot;

    /**
     * A storage object can be used by external modules or extensions to store data associated with the sandbox.
     * 
     * When a snapshot is taken, the storage is shallow copied to the snapshot.
     * When a snapshot is instantiated, the storage is shallow copied to the new sandbox.
     * Use `registerSnapshotCallbacks` function if you need some special handling of
     * your data during snapshot creation or instantiation.
     */
    storage: Storage;
};


/**
 * Represents a saved state of a sandboxed environment that can be restored and reused.
 */
export interface Snapshot {
    /**
     * Instantiates a new sandbox instance from the stored snapshot.
     * 
     * @returns A promise that resolves to a new {@link Sandbox} created from this snapshot.
     */
    instantiate(): Promise<Sandbox>;

    /**
     * A storage object can be used by external modules or extensions to store data associated with the snapshot.
     * 
     * @see {@link Sandbox.storage}
     */
    storage: Storage;
}

type ModuleSyncSourceType = WebAssembly.Module | BufferSource | Response | Request | string | URL

type ModuleSourceType = ModuleSyncSourceType | Promise<ModuleSyncSourceType>;

let currentModule: WebAssembly.Module | undefined = undefined;
let initialPages: number = 0;
let setModulePromise: Promise<void> | undefined = undefined;


export function setModule(moduleSource?: ModuleSourceType): Promise<void> {

    if (currentModule || setModulePromise) {
        return Promise.reject(new Error('Module already set.'));
    } else if (setModulePromise) {
        return setModulePromise;
    }

    setModulePromise = setModuleInternal(moduleSource);

    return setModulePromise
        .then(() => {
            initialPages = 0;
            for (let exp of WebAssembly.Module.exports(currentModule!)) {
                if (exp.name.startsWith(exportInfoPrefix)) {
                    initialPages = parseInt(exp.name.substring(exportInfoPrefix.length), 16);
                    break;
                }
            }
            if (initialPages <= 0) {
                throw new Error('Invalid WebAssembly sandbox module.');
            }
        })
        .finally(() => {
            setModulePromise = undefined;
        });
}

function isThenable(obj: any): obj is PromiseLike<any> {
    return obj != null && (typeof obj === 'object' || typeof obj === 'function')
        && typeof obj.then === 'function' && typeof obj.catch === 'function' && typeof obj.finally === 'function';
}

async function setModuleInternal(moduleSource?: ModuleSourceType): Promise<void> {

    if (!moduleSource) {
        // TODO: detect moduleSource
        throw new Error('Module source is not provided.');
    }

    if (isThenable(moduleSource)) {
        moduleSource = (await moduleSource) as ModuleSyncSourceType;
    }

    if (typeof moduleSource === 'string' || moduleSource instanceof URL || moduleSource instanceof Request) {
        currentModule = await WebAssembly.compileStreaming(fetch(moduleSource));
    } else if (moduleSource instanceof Response) {
        currentModule = await WebAssembly.compileStreaming(moduleSource);
    } else if (moduleSource instanceof WebAssembly.Module) {
        currentModule = moduleSource;
    } else {
        currentModule = await WebAssembly.compile(moduleSource);
    }
}


async function getModule(moduleSource?: ModuleSourceType): Promise<WebAssembly.Module> {
    if (currentModule) {
        return currentModule;
    } else if (setModulePromise) {
        await setModulePromise;
    } else {
        await setModule(moduleSource);
    }
    return currentModule as unknown as WebAssembly.Module;
}


function prepareSandboxObject(
    wrapper: wr.Wrapper,
    snapshotCallbacks: SnapshotCallbacks[],
    outgoing: OutgoingRegistry,
    incoming: IncomingRegistry,
    exports: any,
    imports: any,
    storage: Storage,
): Sandbox {

    return {

        exports,
        imports,
        storage,

        execute(code: string | Bytecode, options?: ExecuteOptions): any {

            let compiled: Bytecode | undefined = undefined;

            try {
                if (typeof code === 'string') {
                    let flags = wr.ExecuteFlags.Once;
                    if (options?.asModule) flags |= wr.ExecuteFlags.Module;
                    if (options?.returnValue) flags |= wr.ExecuteFlags.ReturnValue;
                    compiled = wrapper.compile(code, options?.fileName, flags);
                    code = compiled;
                }
                let argsSerialized = serialize(options?.args);
                let resultSerialized = wrapper.execute(code, argsSerialized);
                let result: any = undefined;
                if ((options?.returnValue || (code.getFlags() & wr.ExecuteFlags.ReturnValue)) && resultSerialized) {
                    result = deserialize(resultSerialized);
                }
                return result;
            } finally {
                if (compiled) compiled.dispose();
            }
        },

        compile(code: string, options?: ExecuteOptions): Bytecode {
            let flags = 0;
            if (options?.asModule) flags |= wr.ExecuteFlags.Module;
            if (options?.returnValue) flags |= wr.ExecuteFlags.ReturnValue;
            return wrapper.compile(code, options?.fileName, flags);
        },

        addSnapshotCallbacks(callbacks: SnapshotCallbacks): void {
            snapshotCallbacks.push(callbacks);
        },

        takeSnapshot(): Snapshot {
            for (let callbacks of snapshotCallbacks) {
                callbacks.beforeTakeSnapshot?.(this);
            }
            let wrapperSnapshot = wrapper.takeSnapshot();
            let outgoingSnapshot = outgoing.store();
            let incomingSnapshot = incoming.clone();
            let storageSnapshot = { ...storage };
            let snapshotCallbacksSnapshot = [...snapshotCallbacks];
            let snapshot: Snapshot = {
                storage: storageSnapshot,
                instantiate(): Promise<Sandbox> {
                    return instantiateSnapshot(
                        snapshot,
                        wrapperSnapshot,
                        outgoingSnapshot,
                        incomingSnapshot,
                        storageSnapshot,
                        snapshotCallbacksSnapshot);
                },
            };
            for (let callbacks of snapshotCallbacksSnapshot) {
                callbacks.afterTakeSnapshot?.(this, snapshot);
            }
            return snapshot;
        }
    };
}


export async function instantiate(options?: InstantiateOptions): Promise<Sandbox> {

    let module = await getModule(options?.module);
    let opt = validateOptions(options);

    let wrapper = new wr.Wrapper(module);
    await wrapper.init(opt.minHeapThreshold, opt.maxHeapSize, opt.maxWasmSize, LogLevel.Info); // TODO: log level

    let snapshotCallbacks: SnapshotCallbacks[] = [];
    let storage: Storage = {};

    {
        using code = wrapper.compile(bootSource, '__sandbox__internal/boot.js', wr.ExecuteFlags.Module | wr.ExecuteFlags.Once);
        wrapper.execute(code);
    }

    // Imports (outgoing calls) setup
    let outgoing = new OutgoingRegistry(true);
    let exports = ((groupId: number) => {
        return outgoing.get(groupId);
    }) as any;
    outgoing.set(0, exports);
    outgoing.onCall = (groupId, functionId, args) => {
        console.log('outgoing.onCall', groupId, functionId, args);
        return deserialize(wrapper.call(groupId, functionId, serialize(args)));
    };

    // Exports (incoming calls) setup
    let incoming = new IncomingRegistry();
    let imports = function(obj: any, groupId?: number) {
        let msg = incoming.register(obj, groupId);
        wrapper.call(0x7FFFFFFF, 0, serialize(msg));
        return msg.groupId;
    }

    wrapper.onCall = (groupId, functionId, arg) => {
        if (!arg) return serialize(undefined);
        let argObj = deserialize(arg);
        console.log('wrapper.onCall', groupId, functionId, argObj);
        if (groupId === 0x7FFFFFFF) {
            outgoing.register(argObj);
            return serialize(undefined);
        }
        return serialize(incoming.execute(groupId, functionId, argObj));
    };

    return prepareSandboxObject(wrapper, snapshotCallbacks, outgoing, incoming, exports, imports, storage);
}

async function instantiateSnapshot(
    snapshot: Snapshot,
    wrapperSnapshot: wr.Snapshot,
    outgoingSnapshot: any,
    incomingSnapshot: IncomingRegistry,
    storageSnapshot: Storage,
    snapshotCallbacksSnapshot: SnapshotCallbacks[],
): Promise<Sandbox> {

    let wrapper = await wr.Wrapper.fromSnapshot(wrapperSnapshot);
    let snapshotCallbacks: SnapshotCallbacks[] = [...snapshotCallbacksSnapshot];
    let storage: Storage = { ...storageSnapshot };

    // Imports (outgoing calls) setup
    let outgoing = new OutgoingRegistry(true);
    outgoing.load(outgoingSnapshot);
    let exports = ((groupId: number) => {
        return outgoing.get(groupId);
    }) as any;
    outgoing.set(0, exports);
    outgoing.onCall = (groupId, functionId, args) => {
        return deserialize(wrapper.call(groupId, functionId, serialize(args)));
    };

    // Exports (incoming calls) setup
    let incoming = incomingSnapshot.clone();
    let imports = function(obj: any, groupId?: number) {
        let msg = incoming.register(obj, groupId);
        wrapper.call(0x7FFFFFFF, 0, serialize(msg));
        return msg.groupId;
    }

    wrapper.onCall = (groupId, functionId, arg) => {
        if (!arg) return serialize(undefined);
        let argObj = deserialize(arg);
        if (groupId === 0x7FFFFFFF) {
            outgoing.register(argObj);
            return serialize(undefined);
        }
        return serialize(incoming.execute(groupId, functionId, argObj));
    };

    let newSandbox = prepareSandboxObject(wrapper, snapshotCallbacks, outgoing, incoming, exports, imports, storage);

    for (let callbacks of snapshotCallbacks) {
        callbacks.instantiateSnapshot?.(newSandbox, snapshot);
    }

    return newSandbox;
}



const FRAGMENTATION_COEFFICIENT = 1.3;
const STATIC_DATA_SIZE = 5 * 1024 * 1024;
const HEAP_THRESHOLD_COEFFICIENT = 0.75;
const DEFAULT_MAX_WASM_SIZE = 32 * 1024 * 1024;
const MIN_WASM_SIZE_LIMIT = 16 * 1024 * 1024;
const MIN_HEAP_SIZE_LIMIT = 8 * 1024 * 1024;
const MESSAGE_SIZE_COEFFICIENT = 0.125;


function validateOptions(invalidOptions?: InstantiateOptions): ValidatedInstantiateOptions {

    let options = { ...invalidOptions } as InstantiateOptions;

    if (!options.maxWasmSize) {
        if (options.maxHeapSize) {
            options.maxWasmSize = Math.ceil(STATIC_DATA_SIZE + FRAGMENTATION_COEFFICIENT * options.maxHeapSize);
        } else if (options.minHeapThreshold) {
            options.maxWasmSize = Math.ceil(STATIC_DATA_SIZE + FRAGMENTATION_COEFFICIENT * options.minHeapThreshold / HEAP_THRESHOLD_COEFFICIENT);
        } else {
            options.maxWasmSize = DEFAULT_MAX_WASM_SIZE;
        }
    } else if (options.maxWasmSize < MIN_WASM_SIZE_LIMIT) {
        throw new Error(`The "maxWasmSize" value must be at least ${MIN_WASM_SIZE_LIMIT} bytes.`);
    }

    if (!options.maxHeapSize) {
        options.maxHeapSize = Math.ceil((options.maxWasmSize - STATIC_DATA_SIZE) / FRAGMENTATION_COEFFICIENT);
    } else if (options.maxHeapSize < MIN_HEAP_SIZE_LIMIT) {
        throw new Error(`The "maxHeapSize" value must be at least ${MIN_HEAP_SIZE_LIMIT} bytes.`);
    } else if (options.maxHeapSize >= options.maxWasmSize) {
        throw new Error(`The "maxHeapSize" value must be smaller than "maxWasmSize".`);
    }

    if (!options.minHeapThreshold) {
        options.minHeapThreshold = Math.ceil(options.maxHeapSize * HEAP_THRESHOLD_COEFFICIENT);
    } else if (options.minHeapThreshold < 0) {
        throw new Error(`The "minHeapThreshold" value must must be positive.`);
    } else if (options.minHeapThreshold >= options.maxHeapSize) {
        throw new Error(`The "minHeapThreshold" value must be smaller than "maxHeapSize".`);
    }

    if (!options.maxMessageEstimatedSize) {
        options.maxMessageEstimatedSize = Math.ceil(options.maxWasmSize * MESSAGE_SIZE_COEFFICIENT);
    }

    if (!options.maxCallRecursion) {
        options.maxCallRecursion = 16;
    }

    return options as ValidatedInstantiateOptions;
}
