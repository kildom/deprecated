

export interface InstantiateOptions {
    maxHeapSize?: number; // default: min((maxWasmSize - estimated static data size) * 0.xx {fragmentation coefficient}, minHeapThreshold * 1.xx)
    maxWasmSize?: number; // default: maxHeapSize ? maxHeapSize * 1.xx + estimated static data size : 32 * 1024 * 1024
    minHeapThreshold?: number; // default: maxHeapSize * 0.xx // TODO: minHeapThreshold
    maxMessageEstimatedSize?: number; // default: 1 * 1024 * 1024 // TODO: Estimated memory size allocated by the data flowing from guest to host.
    maxCallRecursion?: number; // default: 10 // TODO: maximum number of calls between host and guest in one call stack.
                               // Documentation should explain that recursion should be avoided, something like:
                               // "Don't call guest from host function that might be called from guest."
};

export interface ExecuteOptions {
  fileName?: string;
  asModule?: boolean;
  argument?: any; // It will be passed to guest and available from __sandbox__.getArgument()
  topLevel?: boolean; // Default: false. When true, code is executed from within unnamed function.
  returnValue?: boolean; // Pass result from guest to host. If topLevel is true, this is value of the last statement.
                         // If topLevel is false, this is value returned by `return` statement.
  verifyExports?: any; // object structure telling which exported functions must be available after the code execution.
                       // Each exported function cannot be later deleted or replaced by object, so if this verification
                       // passes, it is safe to assume that those exports are always available inside this instance.
};

export type ImportsCallbacks = { [key: string]: ((this: Sandbox, ...args: any[]) => any) | RegisterCallbacks };
export type ExportsCallbacks = { readonly [key: string]: ((...args: any[]) => any) & ExportsCallbacks };

export interface SandboxModule {
  constructor(source: BufferSource // Use WebAssembly.compile
              | Response // Use WebAssembly.compileStreaming
              | Request | string | URL // Use fetch() and WebAssembly.compileStreaming
              | WebAssembly.Module // Use directly
              | SandboxModuleBundleSource // Object contains base-64 data string:
                                          // 1. Set pocessing flag (promise) in "source" or wait if already set
                                          // 2. Convert base-64 to Uint8Array
                                          // 3. Use WebAssembly.compile
              ); // Returns immiedtally, actual waiting is in instantiate
  async instantiate(options?: InstantiateOptions): Promise<Sandbox>;
}

export interface Sandbox {
  dispose(): void;
  execute(code: string, options?: ExecuteOptions): any;
  registerImports(callbacks: ImportsCallbacks): void; // Import and exports internal to the libraries should be unique random string, e.g. `__B6gYgqNxnPAi4xl5wXcFcO`
  exports: ExportsCallbacks;
  tags: { [key: string | symbol]: any }; // Can be used by extensions to store some data.
  freeze(): SandboxModule;
  registerCallbacks({
    beforeFreeze: FreezeCallback,
    afterUnfreeze: FreezeCallback,
    disposeCallback: DisposeCallback,    
  });
};

/*

Examples of extending sandbox:
SandboxHostConsole.apply(mySandbox);
const guestConsole = new SandboxConsole({log: ..., error: ..., warn: ...})
guestConsole.apply(mySandbox);
stringEncoding.apply(mySandbox); // TextEncoder, TextDecoder, atob, btoa
timers.apply(mySandbox); // setTimeout, clearTimeout, ...Interval (some restrictions must be available to protect from overflow)
nodeProcess.apply(mySandbox); // Pollyfill node.js process object

TODO: security risk: how about passing anything as object property named 'toString'?

TODO: freeze/unfreeze callbacks can postpone itself, e.g. when dependent module is not ready yet.

TODO: Give host access to guest raw memory structures, e.g. strings, ArrayBuffers. It will allow, e.g.
      use native TextDecoder/Encoder to implement guest TextDecoder/Encoder.

*/
