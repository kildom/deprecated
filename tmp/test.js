"use strict";

console?.log?.("Hello world", 12);

try {
    // Push finally:finally_label

    break outer_label;
    // ClearStack, newSize=5 # stack size on branch target
    // Br outer_label_break

    // Pop
} finally {
    // -- Separated block --
    // finally_label:          # stack before try block ... | return address to ClearStack instruction
    // # ... Finally code ...
    // Br [POP]

}

try {
    // Push finally:finally_label

    return value;
    // SetReturnValue
    // ClearStack, newSize=0
    // Return
    // If not in try block, just: ReturnValue

    // Pop
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
    // SetError     # stack top popped and set as current error
    // resume_catch_label:
    // Throw
} catch (e) {
    // -- Separated block --
    // finally_label:          # stack before try block ... | return address
    // BrIfErrorNotSet [POP]
    // GetAndClearError
    // # ... Catch code ...
    // Br [POP]
}