

* Where variables can be stored:
    * stack
    * stack -> ClosureEnvironment (used in inner functions)
    * stack -> object (in `with` block)
    * function data -> ClosureEnvironment (from outer function)
    * function data -> object (`with` block from outer function)

* Each running function has its own stack "function stack".
    * Normal functions can use "common stack".
    * Async/generator functions allocates its own stack on heap.

* local variable:
  placement | used by inner functions | read | write
  ---------|---------|---|----
  stack | no | StackGet N | StackSet N
  ClosureEnvironment on stack | yes | StackGet N, ScopeGet0/1 | StackGet N, ScopeSet0/1

* accessible over `with` block (only non-strict mode)
  * read/write:
    ```sh
    FuncDataGet N # object from "with" statement outside this function
    # OR
    StackGet N # object from "with" statement from this function
    Push [variable name string]
    BrIfNotInObject next # Keeps stack if not branched, pops both if branched
    Get/Set
    Br end
    # ... Repeat for each with
    # Read variable as usual
    end:
    ```

* variable outside this function
    * placement: ClosureEnvironment in function data
    * read: FuncDataGet N, ScopeGet0/1
    * write: FuncDataGet N, ScopeSet0/1

* inaccessible (global)
  * strict mode:
    * immutable global:
      * read: ``` Push [predefined object, e.g. Math] ``` or throw error
      * write: throw error
      * compiler warning if missing or writing
    * mutable global:
      * read: Similar to `with` statement, throw error if not found
      * write: Similar to `with` statement, throw error if not found
  * sloppy mode:
    * immutable global:
      * read: ``` Push [predefined object, e.g. Math] ``` or `Push undefined`
      * write: throw error
      * compiler warning if missing or writing
    * mutable global:
      * read: like member get
      * write: like member set

Function creation:
```sh
CreateFunction function_description_address
CopyStack -15 # stack offset where ClosureEnvironment is located
FuncDataSet 0 # ClosureEnvironment is popped, but function object is kept on stack
FuncDataGet 2 # ClosureEnvironment from some parent function
FuncDataSet 1
CopyStack -10 # also with objects are copied
FuncDataSet 2
```

## Variable resolving stages

1. Collect
    * All variables get assigned to their namespaces.
    * Conflicts are detected.
    * Detailed information on variables is not available yet.
2. Bond
    * All variables references are resolved and bounded to their
      respective variables in namespaces.
    * Filled information about usage.
    * If the outer variables are used, the function uid stack is kept
      for later.
    * If variable references goes over a function, it is translated
      into 'outerScope' by that function. The function keeps the
      original reference.
3. Allocate
    * Variables are placed in 


```

Top level scopes examples:

// AstProgram is a top level function, so these works as in normal function.
// If not used in closures, they will be removed after exiting the top level code.
// Access instructions:
// JS, muES - from stack
//     GetLocal varIndex / SetLocal varIndex
// JS, muES - outer scopes
//     GetFunctionData closureEnvironmentIndexInFunctionData
//     GetEnvByIndex varIndex / SetEnvByIndex varIndex
let x; var y; const z;

// Looks like global using is never destroyed, so it can work as `const` in top level context.
using x = f();

// Exported variables are place in module object - non-extensible object with null prototype.
// Module object can be special object with its own access functions table.
// Access instructions:
// JS - get
//     GetModuleProperty moduleIndex, name
// JS - set
//     SetModuleProperty moduleIndex, name
// muES - get
//     GetModule index
//     GetPropertyByIndex index
// muES - set
//     GetModule index
//     Swap // Or get module before value
//     SetPropertyByIndex index
export let a = 1;

// In sloppy mode, undeclared variables are created in globalThis object.
// In strict mode, it throws error. If globalThis is not extensible that error
// is detectable at compile time.
// JS - set
//     SetGlobalThisProperty name
// muES - set
//     GetModule 0 // in muES, globalThis is placed in the module array index 0
//     Swap // Or get globalThis before value
//     SetPropertyByName name
//     OR if globalThis is not extensible:
//     SetPropertyByIndex index
g = 99;

// In both modes, undeclared variables are searched in globalThis object, but not
// created - ReferenceError instead. If globalThis is not extensible that error
// is detectable at compile time.
// JS - get
//     GetGlobalThisPropertyWithError name
// muES - get
//     PushString name
//     Call $muesGetGlobalThisPropertyWithError
f(g_undeclared);

// If properties of globalThis and Math are read-only, then this can be optimized:
Math.floor(x / 3);
// JS, muES
//     IntDiv 3

```