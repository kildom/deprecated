
```js


try {
    // Push finally:finally_label

    break outer_label;
    // ClearStack, newSize=5 # stack size on branch target
    // Br outer_label_break

} finally {
    // -- Separated block --
    // finally_label:          # stack before try block ... | return address to ClearStack instruction
    // # ... Finally code ...
    // Br [POP]

}

try {
    // Push finally:finally_label

    return value;
    // # stack top is value
    // SetReturnValue
    // ClearStack, newSize=0
    // Return
    // If not in try block, just: ReturnValue

} finally {
    // -- Separated block --
    // finally_label:          # stack before try block ... | return address to ClearStack instruction
    // # ... Finally code ...
    // Br [POP]

}

try {
    // Push finally:finally_label

    throw new Error();
    // # stack top is Error object
    // SetErrorValue     # stack top popped and set as current error
    // resume_catch_label:
    // Throw
} catch (e) {
    // -- Separated block --
    // finally_label:          # stack before try block ... | return address to Throw instruction
    // BrIfErrorNotSet [POP]
    // GetAndClearError
    // # ... Catch code ...
    // Pop # ignore resume address since we handled thrown error
}

```