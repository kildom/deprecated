
### Types of memory

* RAM
    * Heads Table
        * Usage map
        * Heads, few heads at the beginning are reserved:
            * Global Stack
            * ... maybe more
    * Heap
        * Contains also global stack as normal block
        * Each block MUST contain index of associated head
* ROM
    * Divided into multiple parts, prefix decides which part is addressed:
        * User data
        * Engine data (Standard objects / classes)
        * Engine data can be divided into more spaces.
          Each space can be enabled/disabled by the configuration.
          TODO: IS IT NEEDED?

### Index prefixes

* Indexes and offsets have a prefix that tells where it is stored:
    * RAM / Heap - runtime data (prefix 0)
    * User ROM - compile time data
    * Engine ROM - predefined engine data
* Prefixes apply for:
    * Head index
    * Block offset
    * Bytecode offset
    * Is there more?

### ROM

Contains:
* bytecode,
* ROM heads,
* ROM objects,
* function descriptions

### Value

Single 32-bit value, contains:
* Flags
* Type
* Content

Value types:
* Integer
    * content: integer in range -2^27 .. 2^27-1
    * In instructions where unsigned integer is expected, range is 0 .. 2^28-1
* Boolean
    * content: 0 or >=1
* Null
* Undefined
* None
    * 0 - empty slot
    * 1 - end of list
    * also used for uninitialized variables
* Symbol
    * content: head index
    * head: description string value or undefined
* Object
    * content: head index
    * head:
        * heap block offset or ROM block offset
        * Object specific value - useful for similar objects, but with one different value.
          The common part is placed as ROM object, e.g.:
            * resolve/reject functions created by `await` points to the same ROM object, but with function state in the "Object specific value".
            * native functions have common ROM object and native data in the "Object specific value".
    * block: the object
* Accessor
    * content: head index
    * head: getter value, setter value
* Microscope 
    * content: head index
    * head: two values
* FunctionState ???
    * content: head index
    * head: heap block offset
    * heap block: function state: resume point, stack, ???
* Double
    * content: head index
    * head: 64-bit double value
* ShortString
    * content:
        * up to 3 bytes of string
        * if less than 3, it is NULL-terminated
        * cannot contain NULL characters
    * useful for minimized Javascript
* String
    * content: head index
    * head
        * heap block offset or ROM block offset
        * hash
    * block:
        * length
        * UTF-8 encoded string
* BigInt
    * content: head index
    * head: heap block offset or ROM block offset
    * block: 32-bit parts of the big integer
* Native Head
    * content: head index
    * head: any content (up to 8 Bytes)
* Native Block
    * content: head index
    * head
        * heap block offset
        * destructor function pointer
* Finally block
    * content: finally block absolute offset

Flags:
* ROM head flag
    * only available when value has head index
    * the head is located in ROM head table
    * reference counter does not work
* Configurable flag, Enumerable flag, Writable flag
    * only available for string and symbol value inside object key,
      ignored in other cases
    * defines object property options

#### Small memory model

* Head size: 6 bytes
* Reference counter: 16-bits
* Head index: ROM flag + 15-bits (32K elements, 192KB)
* Block offset: ROM flag + 15-bits (32K offsets, 128KB allocable)
* One value in microscope
* Length (string/array): 16-bits
* String hash: 16-bit
* FLOATING values instead of double

Value types:
* Accessor
    * head:
        * getter head index,
        * setter head index
* Microscope 
    * head: ONE value
* Double
    * content: head index
    * head: 32-bit FLOAT value
* String
    * content: head index
    * head
        * heap block offset or ROM block offset
        * hash
    * block:
        * length
        * UTF-8 encoded string
* Native Head
    * content: head index
    * head: any content (up to 4 Bytes)
* Native Block
    * content: head index
    * head
        * heap block offset
        * destructor function pointer

### Head

Constant size block of data shared between multiple values.

Content:
* 32-bit reference counter
    * If weak references are used, highest bit indicates that this
      object can be weakly referenced and we have to call weak
      reference handler.
* 64-bit of data defined by the value type

Can be located on both ROM and RAM.

### Heads table

* Table of heads
* At the beginning of RAM or at specific location in ROM.
* Resizable. If it must grow, heap will shrink.
  If heap is full, and there is free space at the end of table,
  it can give back some bytes.
* Quickly allocable using bit map located after the table.
    * levels: 2 - 1K elements (12KB)
    * levels: 3 - 32K elements (384KB)
    * levels: 4 - 1M elements (12MB)
    * levels: 5 - 12M elements (384MB)
    ```c
    allocation for 3 levels:

    bitmap0 = bitmap
    index0 = clz(bitmap0[0])

    bitmap1 = bitmap0 + 1
    bit_index1 = clz(bitmap1[index0])
    index1 = 32 * index0 + bit_index1

    bitmap2 = bitmap1 + 32
    bit_index2 = clz(bitmap2[index1])
    index2 = 32 * index1 + bit_index2

    bitmap2[index1] ^= 1 << bit_index2
    if (!~bitmap2[index1]) {
        bitmap1[index0] ^= 1 << bit_index1
        if (!~bitmap1[index0]) {
            bitmap0[0] ^= 1 << index0
        }
    }

    result = &heads_table[index2]
    ```
    ```c
    deallocation for 3 levels:

    index2 = ptr - heads_table
    bit_index2 = index2 & 31
    index1 = index2 >> 5

    if (!~bitmap2[index1]) {
        bit_index1 = index1 & 31
        index0 = index1 >> 5
        if (!~bitmap1[index0]) {
            bitmap0[0] ^= 1 << index0
        }
        bitmap1[index0] ^= 1 << bit_index1
    }
    bitmap2[index1] ^= 1 << bit_index2
    ```

### Global stack

* Storage for LIFO data:
    * Normal (not async or generator) functions stack
    * Call stack

### Call stack

* Located on the global stack
* Contains currently running function on top
* Each entry contains:
    * 

### Weak references

* Weak references works the same as normal references during normal runtime
* ~~One of GC stages walks over all objects that holds weak references (WeakRef, WeakMap, WeakSet)
  and checks if reference counter is `1`.
  If yes, it removes reference which causes deallocation of referenced object.~~
* The solutin above is not valid. Weak reference may point to an object that is part of unreferenced cycle. The counter will be `2` or more, but cycle must be deallocated.
* Maybe the following solution during GC:
  1. When counting references to find roots, travel weak references the same as normal references.
  1. When traveling graph to mark reachable objects, ignore weak references.
  1. Walk over all weak references and clear those pointing to unreachable objects.

# Other notes

* Each object can have its own "virtual functions": dispose, get, set, has, ownKeys, e.t.c.
  * Something similar to `Proxy` but in native code
  * Size optimization: some fields are optional and may be groupped to reduce overall size if not all groups are implmented
  * There are no NULL function pointers. If it should be a default implementation, the pointer will point to default function
  * Standard objects can point to default implementation of those functions, so there will be no API difference between standard object and non-standard
  * This should simplify `Proxy` class implementation.
  * This way, we don't need a different type for standard objects, native objects, `Proxy` instances, `Function` instances.
* Array and any other object should have the same layout: chunks of array for ineger indexed properties, key-value pairs for others.
  * This way following problems are solved:
    * Strange order of property enumaration when integer indexed properties are ordered and first
    * Using `Array.prototype` functions on other object, e.g. `Array.prototype.slice.call(arguments, 0)`
      * Problematic may be case when object has custom virtual functions, but looks like other engines does not support it.
  * `arguments` object will have values in this array chunks (one chunk)
  * For objects without integer keys, the first array chunk pointer will be null.
  * Optional size optimization: integer-only objects (`Array`, `arguments`) may have its first chunk after the object data (instead of key-vaule pairs)
    If non-integer key is added, array should be moved to a new chunk and key-value pairs will reuse the old array space.
