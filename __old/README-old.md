# Secure JavaScript sandbox

Run JavaScript in an isolated sandbox using Spidermonkey engine compiled to WebAssembly.

## Design

Target: `wasm32-wasi`

Module loading:
* The user should be able to limit WASM module memory size.
* If the limit is different than the default, the module bytecode will be modified accordingly.

Startup:
1. Call `JS_Init`
2. Call `imported sandbox.entry()` that throws `SandboxEntryIsNotARealException`.
3. After throwing an exception WebAssembly module state
   is frozen (from sw point of view).
4. Now, the host can call exported functions like in `-mexec-model=reactor`
   and guest software should think that it is called from the `sandbox.entry` function.
   This trick is required because `reactor` does not work for `wasm32-wasi` target.
5. Proper destruction of the module (e.g. global destructors, `JS_ShutDown`) is not possible.

Interface:
* `export _start` - standard start function. On success, it throws `SandboxEntryIsNotARealException`, on failure, it returns normally.
* TODO: is it needed? `export malloc, realloc, free` - standard malloc functions (standard buffer).
* `export createContext(heapLimit: int32): int32` - create new JS engine context.
* `export deleteContext(ctx: int32)` - delete JS engine context.
* `export mallocJs(ctx), reallocJs(ctx), freeJs(ctx)` - `JS_malloc`, `JS_realloc`, `JS_free` (JS buffer).
* `export execute(ctx: int32, buffer: int32, size: int32, fileName: int32, flags: int32): int32` - execute JS code. In case of exception, returns buffer with JSON encoded exception. Flags:
    * `RUN_AS_MODULE`
    * `RETURN_VALUE` - on success return result that is the same as `send`.
* `export sendClearArgs(ctx: int32)` - clear prepared arguments
* `export sendSimpleArg(ctx: int32, index: int32, type: int32): int32` - send undefined, null, true, false
* `export sendNumberArg(ctx: int32, index: int32, value: float64): int32` - send number
* `export sendBufferArg(ctx: int32, index: int32, buffer: int32, size: int32, flags: int32): int32` - send string, JSON, ArrayBuffer, or bigint. Flags:
  * `STRING` - this is a string
  * `JSON` - this is a JSON
  * `BIGINT` - this is a string representation of bigint
  * `ARRAYBUFFER`
  * `TAKE_OVER` - suggest function to take over the buffer
  * `LATIN1` - string contains latin1 charset
  
  Returns:
  * `FAILED` - adding failed
  * `SUCCESS` - adding was successful
  * `TAKEN` - the buffer was taken over by guest and cannot be used anymore

  STRING
  * Caller behavior:
    * small (at most common_buffer.length / 3 or less)
      * use common buffer
      * do `TextEncoder.encodeInto()`
      * set LATIN1 if written == length
    * big
      * allocate `2 * length` buffer or take common buffer if similar size
      * do `TextEncoder.encodeInto()`
      * set LATIN1 if written == length
      * if failed: 
        * if `written + 3 * remaining <= common buffer` free this buffer and retry with common buffer
        * else: reallocate and retry with `3 * remaining` more bytes
      * set TAKE_OVER flag
  * Callee behavior:
    * if (almost entire buffer is used or TAKE_OVER flag) and LATIN1 flag
      * reallocate to correct size
      * `JS_NewExternalStringLatin1`
      * return TAKEN
    * else
      * `JS_NewStringCopyUTF8N`
      * return SUCCESS
  
  JSON
  * Caller behavior:
    * if may fit into common buffer
      * do `TextEncoder.encodeInto()`
      * set LATIN1 if written == length
    * else:
      * allocate new buffer `2 * length`
      * do `TextEncoder.encodeInto()`
      * set LATIN1 if written == length
    * if failed (any of above)
      * allocate or reallocate `written + 3 * remaining`
      * do `TextEncoder.encodeInto()`
  * Callee behavior:
    * if LATIN1 flag
      * `JS_ParseJSON char`
      * return SUCCESS
    * else
      * `JS_NewStringCopyUTF8N` and later `JS_ParseJSON`
      * return SUCCESS

  BIGINT
  * Caller behavior:
    * if fits into common buffer
      * do `TextEncoder.encodeInto()`
    * else:
      * allocate new buffer `length`
      * do `TextEncoder.encodeInto()`
    * set LATIN1
  * Callee behavior:
    * `StringToBigInt Latin1Char`
  
  ARRAYBUFFER
  * Caller behavior (standard ArrayBuffer or its views):
    * allocate JS buffer
    * copy content
  * Caller behavior (GuestArrayBuffer or its views):
    * nothing, just send as it is
  * Callee behavior:
    * `NewArrayBufferWithContents`
    * new typed array or view based on the 

* `export send(ctx: int32, responseBuffer: int32, responseBufferSize: int32, flags: int32): int32` - send message to the guest and get response. Flags:

    * `ALLOW_UTF16` - allow 'utf-16le' encoding in response
    * `ALLOW_LATIN1` - allow 'latin1' encoding in response

  Return buffer (may reuse the input buffer if it is big enough).
  May be exception `{"class":"TypeError","message":"The message"}` or array:

  Header:
    * count: int64 - number of array items

  Array Item:
    * type_and_flags: int32, flags:
      * `DEALLOCATE` - request deallocation of the buffer
    * data: int8[12]
    * simple, type := undefined, null, boolean, number
    * string
      * latin1 if allowed and no error
        * `JS_GetLatin1StringCharsAndLength` and copy to new buffer or main buffer
        * type := string-latin1
        * `TextDecoder('latin1').decode`
      * utf-16 if allowed and no error
        * `JS_GetTwoByteStringCharsAndLength` and copy to new buffer or main buffer
        * type := string-utf16
        * `TextDecoder('utf-16le').decode`
      * otherwise
        * `JS_EncodeStringToUTF8BufferPartial` to main buffer or new buffer `2 * length`
        * if unsuccessful: reallocate buffer with additional `3 * remaining`
        * type := string-utf8
        * `TextDecoder.decode`
    * object, array
      * if utf-16 allowed
        * `ToJSON` and copy to new buffer or main buffer
        * type := json-utf16
        * `TextDecoder('utf-16le').decode`
        * `JSON.parse`
      * otherwise
        * call `globalThis.JSON.stringify(value)` from C++
        * do the same as string, but use json-... instead of string-... as a types
        * `JSON.parse`
    * bigint
      * `BigIntToString`
      * allocate `length` bytes or use main buffer
      * `JS_EncodeStringToUTF8BufferPartial` (will always succeed)
      * type := bigint
      * `TextDecoder.decode`
      * `BigInt(...)`
    * ArrayBuffer, Uint8Array, DataView, ...
      * as the last operation to ensure no GC `GetObjectAsArrayBuffer`
      * type := ArrayBuffer, Uint8Array, DataView
      * `moduleInstance.memory.buffer.slice(offset, length)`
      * If multiple views share the same guest array buffer, host
        will create also one array buffer

* `import sandbox.received(ctx: int32, dataArray: int32): int32` - receive message from guest to host.
  * dataArray the same as returned value of `send`
  * use `sendXyzArg` to send response. Guest will consume those
    after exiting `sandbox.received`
  * return null on success, buffer with JSON exception on failure.


```javascript
// Objects encoded before being send
{
    // Unmodified
    "bool": true,
    "number": 123,
    "null": null,
    "short_string": "directly",
    // unique prefix, '#', and index of parameter with actual value
    "very_long_string": "\u007F#4",
    // unique prefix and '!'
    "undefined": "\u007F!",
    // unique prefix, '%', and string representation of bigint
    "bigint": "\u007F%297203467863434",
    // unique prefix, '#', and index of parameter with data
    "typed_array_or_array_buffer": "\u007F#6",
    // unique prefix, '#', and index of parameter with data
    "guest_array_buffer_or_its_wrapper": "\u007F#7",
    "object": {
        // The same as above
    }
    "array": [
        // The same as above
    ]
}

```