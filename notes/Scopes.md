

* Where variables can be stored:
    * stack
    * stack -> microscope (used in inner functions)
    * stack -> object (in `with` block)
    * function data -> microscope (from outer function)
    * function data -> object (`with` block from outer function)

* Each running function has its own stack "function stack".
    * Normal functions can use "common stack".
    * Async/generator functions allocates its own stack on heap.

* local variable:
  placement | used by inner functions | read | write
  ---------|---------|---|----
  stack | no | StackGet N | StackSet N
  microscope on stack | yes | StackGet N, ScopeGet0/1 | StackGet N, ScopeSet0/1

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
    * placement: microscope in function data
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
CopyStack -15 # stack offset where microscope is located
FuncDataSet 0 # microscope is popped, but function object is kept on stack
FuncDataGet 2 # microscope from some parent function
FuncDataSet 1
CopyStack -10 # also with objects are copied
FuncDataSet 2
```