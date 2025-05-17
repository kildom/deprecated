
import { ArrayBufferViewType, RegisterCallbacks } from '../src-common/common';


export interface GuestSandboxObject {

    // TODO: Put internal stuff in a separate object
    _onDataToHost?: (data: any) => string;
    _onDataFromHost?: (data: string) => any;
    _call?: (groupId: number, functionId: number, arg: any) => any;
    call(groupId: number, functionId: number, arg: any): any;
    // End of internal stuff

    imports: RegisterCallbacks;

    exports(obj: any, groupId?: number): number;

    memory: {
        /** Total memory currently allocated by the WASM module. */
        readonly total: number;

        /** Maximum memory the WASM module is allowed to allocate. */
        readonly limit: number;

        /** Memory reserved for the heap, including overhead and fragmentation. */
        readonly heapReserved: number;

        /** Usable portion of heap memory actively used by the JS engine. */
        readonly heapUsed: number;

        /** Peak observed `heapUsed` value. Actual usage may be slightly higher, but never exceeds `gcThresholdPeak`. */
        readonly heapUsedPeak: number;

        /** Limit beyond which `heapUsed` may cause a fatal memory error in the sandbox. */
        readonly heapUsedLimit: number;

        /** Current threshold of `heapUsed` that triggers a full garbage collection. */
        readonly gcThreshold: number;

        /** Minimum allowed value for `gcThreshold`. */
        readonly gcThresholdMin: number;

        /** Peak recorded value of `gcThreshold`. */
        readonly gcThresholdPeak: number;

        /** Current size of the WASM C/C++ stack. */
        readonly stackUsed: number;

        /** Maximum allowed size of the WASM C/C++ stack. */
        readonly stackUsedLimit: number;

        /** Force full GC now. */
        gc(): void;

        /** Analyze WASM C/C++ stack area to calculate peak usage. */
        calculateStackUsedPeak(): number;
    }
};

declare global {
  var __sandbox__: GuestSandboxObject;
  interface GlobalThis {
    __sandbox__: GuestSandboxObject;
  }
}
