
The data is encoded similarly to `JSON.stringify` with the following exceptions:
* One instance of object will produce one instance on the guest side,
  even if it is used multiple times.
* Circular reference are allowed.
* Following types can be used:
  * ArrayBuffer, SharedArrayBuffer - content is copied to the guest side.
  * ArrayBuffer views (Int8Array, Uint8Array, Uint8ClampedArray, Int16Array,
    Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array,
    BigInt64Array, BigUint64Array, DataView) - only used part of underlying
    ArrayBuffer will be allocated and copied to the guest side.
  * Error - all inherited Errors will be passed as `Error` with the same message.
  * Map
  * Set
  * RegExp
  * Date
  * bigint
* `NaN`, `+Infinity` and `-Infinity` are allowed
* `undefined` can be used
* All other unsupported types will be converted to `undefined`, e.g. `Symbol`
* Functions are encoded as normal objects.
* Empty array items will be preserved correctly.
