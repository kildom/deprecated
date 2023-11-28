
## Call stack

### On function entry

| Global stack |
|--------------|
...
`this`
function object
arg 0
arg 1
...
arg K-1
number of arguments
return address

* where *K* is number of arguments provided by the caller.

### First stage of prologue (normal function)

Processing:
* Adjust arguments
  * If `arguments` object is required
    * Create `arguments` object
    * Replace all arguments with references to `arguments` object
    * If rest parameter:
      * Roll back rest parameter
      * Set as additional argument directly on stack
  * Else
    * Add `undefined` if arguments are missing
    * Unwind stack if too many arguments
    * If rest parameter:
      * Roll back rest parameter
  * Keep "return address"
  * Remove "number of arguments"
  * For the future: for "--optimize=speed" option, move microscopes from function object to stack.

| Global stack |
|--------------|
`this`
function object
arg 0
arg 1
...
arg N-1
return address

* where N is expected number of arguments

### First stage of prologue (async function)

* Do first stage of prologue for normal function.
* Allocate new local stack
* Push reference to old local stack into the global stack.
  It will be restored on return or interruption, so it
  can be in the global stack.
* Move contents of global stack into local stack.
  Except return address and old local stack.
  Future optimization: Move only arguments that must be preserved
  during interruption.
* Set new local stack as current local stack.

| Local stack | Global stack |
|-------------|--------------|
(placeholder) | return address
function object | old local stack
arg 0
arg 1
...
arg N-1
`this`

The placeholder will be replaced with a new Promise object
associated with this function.

## `await`

```sh
# global stack:
# return address, old local stack, Promise object or then-able object
Call awaitHandler
# global stack:
# return address, old local stack, await expression result
```

The `awaitHandler`:
* do things defined by the specs,
* adds local stack to list of waiting objects.
  When Promise will be resolved, waiting stack will be treated
  in special way. It will restore local stack and jump
  to `asyncResume`.
* Move resume address to local stack top.
* Returns a Promise object associated with this function.

Stacks after `awaitHandler` (just before `Return` instruction).

| Local stack | Global stack |
|-------------|--------------|
Promise object | Promise object
function object | return address
...
resume address

The `asyncResume`:
* Arguments passed on global stack: resolved value, local stack reference, return address
* push old local stack reference to global stack.
* set requested local stack
* Move "resume address" to global stack
* Jump to "resume address"

Stack after exiting `asyncResume` on first instruction after `Call awaitHandler`.

| Local stack | Global stack |
|-------------|--------------|
Promise object | return address
function object | old local stack
...

Return from `async` function:
* call special hidden function `[[resolve]]` on Promise object.
* Restore "old local stack"
* Delete local stack
* Return "promise object"

# Deprecated

Part of below code is deprecated.
There is no argument container, stack base, current stack.

### Arguments on function call:

* case: Calling without rest arguments from normal/async/generator:
   * `this` argument is pushed onto the current stack
   * All arguments are pushed onto the current stack

* case: Calling with rest argument at the end from normal function:
   * `this` argument is pushed onto the global stack
   * Arguments are pushed onto the global stack
   * Last rest argument is unrolled

* case: Calling with rest arguments in the middle from normal/async/generator function:
   * `this` argument is pushed onto the current stack
   * Arguments are pushed onto the current stack
   * Non-rest arguments are copied to the global stack
   * Rest arguments are unrolled to the global stack


### Parameters on function entry:

* Function gets arguments:
  * in special arguments container placed on local or global stack,
    * container has length, but actual end of container is limited by stack top.
  * with `this` parameter at the beginning,
  * all rest arguments are unrolled,
  * size is known and can be smaller than number of parameters,
  * accessing parameters out of bounds returns `undefined`.

* case: Async/Generator
    1. Copy known arguments from arguments container and push to local stack.
    2. Roll back rest parameter by popping values from the stack.
       Push result to local stack.
    3. Pop know parameters from source stack (already copied in the first step).
    4. Destructing and defaults.
    5. Use arguments from local stack only.
* case: Normal function
    1. Increase size of arguments container to include all non-const parameters.
       * If it is on local stack, and there is not enough space, move it to global stack (pop from local).
    2. Roll back rest parameter by popping values from the stack.
       Push result to main stack.
    3. Destructing and defaults.
    4. Use arguments from arguments container and global stack.
* case: The `arguments` object used inside normal/async/generator function
    1. Roll back rest parameter without popping values from the stack.
       Push result to current stack.
    2. Create new `arguments` object from current arguments container.
       Add invisible items to that object if the arguments are missing.
       Push result to current stack.
    3. If source stack and current stack are the same (global stack),
       unwind arguments keeping last two stack elements.
       Pop from source stack otherwise.
    4. Destructing and defaults.
    5. Use arguments from current stack and `arguments` object.

#### Destructing and defaults

Destructuring parameters are destructed and pushed to main stack.
Last destructuring parameter can override the source object.
Passing `undefined` to destructuring parameter is always an error,
so we know that place from source parameter is always available.

Default values are assigned at the end. If parameter has default
value, then it is non-const.

If `this` argument is unused, use it to store some other value.
If any other argument is unused and we are not using `arguments` object,
use it to store some other value. The other value may be:
local variable, variable created by destructuring parameter.


#### Arguments container

It is reference to stack global item that holds
number of arguments, preceded by actual arguments.
Last argument on top. First argument is always `this`.

UPDATE: Parameters should be on global stack. There is one
case when it would be beneficial to use local stack:
when one of the argument expressions contains `await` or
`yield`.

#### Sample bytecode

```sh
# someFunction(a, b, c)
someFunction:
SetCurrentStack global
Push 4
Call AddUndefParams

...

AddUndefParams:
ReadStack @params [BASE] + 0
# stack: expected, actual
Sub
Dup
CmpGT 0
JumpIfTrue AddThem:
Pop
Return
AddThem:
# stack: number of arguments to add
ReadReg ParamsStack
JumpIfTrue HandleParamsOnLocalStack
# stack: number of arguments to add
Dup
ReadStack @params [BASE] + 0
Add
WriteStack @params [BASE] + 0
Loop:
Push @params undefined
Swap
Sub 1
Dup
CmpGT 0
JumpIfTrue Loop
Pop
Return

HandleParamsOnLocalStack:
# stack: number of arguments to add
GetStackSize localStack
GetStackPointer localStack
Sub


```




```sh

ReadStack [BASE] + 3
Push "someMethod"
Push "foo"
Push "bar"
# stack: obj | method name | arg0 | arg1 |
Call CallMethod2
...

CallMethod2:
# stack: object, method name, arg0, arg1, return address
ReadStack [SP] - 4
ReadStack [SP] - 4
Get
# stack: object, method name, arg0, arg1, return address, method
Push 2
WriteStack [SP] - 5

```

That unrolls rest parameter

```sh
UnrollRestParameterOnGlobalStack:
# stack top: Array, return address
swap
# stack top: return address, Array
push @@iterator symbol
push 0
callMethod
repeatLoop:
# stack top: return address, iterator
push "next"
push 0
callMethod keepObject
# stack top: return address, iterator, iterator result
push "done"
getProperty keepObject
# stack top: return address, iterator, iterator result, done value
BranchIfTrue exitLoop
# stack top: return address, iterator, iterator result
push "value"
getProperty
# stack top: return address, iterator, value
swap 2
# stack top: value, return address, iterator
branch repeatLoop
exitLoop:
# stack top: return address, iterator, iterator result
drop 2
Return
```

### Some other ideas

```sh

# func(1, 2);
GetLocal func
PushInt 1
PushInt 2
# if bytecode location unknown
    PushInt 2
    Call
# OR if bytecode location is known during compilation
    BrWithLink func_start_without_prepare
...


func_start: # Func | A | B | ... | N | RetAddr
BrWithLink prepareParameters2
func_start_without_prepare: # | Func | A | B | RetAddr


```