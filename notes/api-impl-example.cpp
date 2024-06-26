
/*


String.prototype.split = function() {
    `bytecode:::

    // ... Prologue: ensure three parameters: this, sep, limit

    // TODO: Redirect to RegExp module if sep is regexp.

    Raw.AllocStack {...}
    .LocalName thisArg, -3
    .LocalName sepArg, -2
    .LocalName limitArg, -1
    Dup thisArg
    ToString
    Raw.SetBuffer 0 // TODO: First part can extracted to a separate procedure and used for both split and replaceAll (without RegExp).
    .set thisBuffer = 0
    Dup sepArg
    ToString
    Raw.SetBuffer 1
    .set sepBuffer = 1
    Raw.Import limitArg // TODO: check limit is zero
    Raw.Const 0
    Raw.Const 1
    .Raw.LocalName limit, -3
    .Raw.LocalName i, -2
    .Raw.LocalName partsCount, -1
    LOOP:
        Raw.Dup i
        Raw.BufferLength thisBuffer
        Raw.BufferLength sepBuffer
        Raw.Sub
        Raw.Lt
        Raw.BranchFalse LOOP_END
        Raw.Dup partsCount
        Raw.Dup limit
        Raw.Lt
        Raw.BranchFalse LOOP_END
        Raw.Dup i
        Raw.Const 0
        Raw.BufferLength sepBuffer
        Call memcmp
        Raw.BranchIfZero SEP_MATCHED
            Raw.Dup i
            Raw.Add 1
            Raw.Write i
            Branch LOOP
        SEP_MATCHED:
            Raw.Dup partsCount
            Raw.Add 1
            Raw.Write partsCount
            Raw.Dup i
            Raw.BufferLength sepBuffer
            Raw.Add
            Raw.Write i
            Branch LOOP
    LOOP_END:
    Raw.Dup partsCount
    Raw.Export
    NewArray
    .LocalName result
    Raw.Const 0
    .Raw.LocalName arrayIndex
    Raw.Const 0
    .Raw.LocalName currentPartStart
    Raw.Const 0
    Raw.Write i
    LOOP2:
        Raw.Dup i
        Raw.BufferLength thisBuffer
        Raw.LE
        Raw.BranchIfFalse LOOP2_END
        Raw.Dup arrayIndex
        Raw.Dup partsCount
        Raw.LT
        Raw.BranchIfFalse LOOP2_END
        Raw.Dup i
        Raw.BufferLength thisBuffer
        Raw.SUP
        Raw.BranchIfZero IF2_TRUE
        Raw.Dup i
        Raw.Const 0
        Raw.BufferLength sepBuffer
        Call memcmp
        Raw.BranchIfZero IF2_TRUE
            Raw.Dup i
            Raw.Add 1
            Raw.Write i
            Branch IF_END
        IF2_TRUE:
            Raw.Dup i
            Raw.Dup currentPartStart
            Raw.Sub
            Raw.Export
            NewString
            Dup
            Dup
            Raw.SetBuffer 2
            .set partBuffer=2
            Raw.Export arrayIndex
            SetArrayItem
            Raw.Const 0
            Raw.Dup currentPartStart
            Raw.BufferLength partBuffer
            Raw.ShuffleBuffers 0=partBuffer, 1=thisBuffer, 2=sepBuffer
            Call memcpy
            Raw.ShuffleBuffers partBuffer=0, thisBuffer=1, sepBuffer=2
            // "part" string is on top of the stack
            ClearStringHash
            Raw.Dup i
            Raw.Const sepLength
            Raw.Add
            Raw.Dup
            Raw.Write i
            Raw.Write currentPartStart
            Raw.Dup arrayIndex
            Raw.Add 1
            Raw.Dup arrayIndex
        IF_END:
        Raw.Dup i
        Raw.BufferLength thisLength
        Raw.BufferLength sepLength
        Raw.Sub
        Raw.Gt
        Raw.BranchIfFalse LOOP2
        Raw.BufferLength thisLength
        Raw.Write i
        Branch LOOP2
    LOOP2_END:
    Raw.ClearStack {...}
    // Epilogue: return "result" variable from stack
    `;
}

*/

bool stringSplit(RefValue& resultValue, BorrowedValue thisValue, BorrowedValue sepValue, BorrowedValue limitValue)
{
    ASSERT_GC_AVAILABLE; // Checks if NoGC counter is 0
    auto limit = limitValue.toInteger<int>();
    if (limit <= 0) {
        resultValue = newArray(0);
        return true;
    }
    RefString thisRef = thisValue.toString();
    RefString sepRef = sepValue.toString();
    if (!thisRef || !sepRef) return false;
    int thisLength;
    int sepLength;
    int partsCount = 1;
    {
        AssertNoGC noGC; // Increases NoGC counter
        const char *thisPtr = thisRef.getCStr(noGC, thisLength); // noGC parameter is not used, it is only to ensure that programmer didn't forget to disable GC
        const char *sepPtr = thisRef.getCStr(noGC, sepLength); // getCStr should also assert that noGC counter is not zero.
        for (int i = 0; i < thisLength - sepLength && partsCount < limit; /* i += ??? */) {
            if (std::memcmp(thisPtr + i, sepPtr, sepLength) == 0) {
                partsCount++;
                i += sepLength;
            } else {
                i++;
            }
        }
    }
    RefArray arrayValue = newArray(partsCount);
    {
        AssertNoGCScope noGC; // Increases NoGC counter
        const char *thisPtr = thisRef.getCStr(noGC);
        const char *sepPtr = sepRef.getCStr(noGC);
        int arrayIndex = 0;
        int currentPartStart = 0;
        for (int i = 0; i <= thisLength && arrayIndex < partsCount; /* i += ??? */) {
            if (i == thisLength || std::memcmp(thisPtr + i, sepPtr, sepLength) == 0) {
                int length = i - currentPartStart;
                StringRef partRef;
                {
                    AssertStopNoGCScope allowGC(noGC); // Decrease NoGC counter and assert it is zero
                    partRef = StringRef::create(length);
                    if (!partRef) return false;
                    arrayValue.set(arrayIndex, partRef);
                }
                thisPtr = thisRef.getCStr(noGC);
                sepPtr = sepRef.getCStr(noGC);
                auto partPtr = partRef.getCStr(noGC);
                std::memcpy(partPtr, thisPtr + currentPartStart, length);
                partRef.clearHash();
                i += sepLength;
                currentPartStart = i;
                arrayIndex++;
            } else {
                i++;
            }
            if (i > thisLength - sepLength) {
                i = thisLength;
            }
        }
    }
    resultValue = std::move(arrayValue);
    return true;
}

bool stringRepeat(RefValue& resultValue, BorrowedValue thisValue, BorrowedValue countValue)
{
    ASSERT_GC_AVAILABLE;
    auto count = countValue.toInteger<int>();
    if (count <= 0) {
        resultValue = newString(0);
        return resultValue != nullptr;
    }
    RefString thisRef = thisValue.toString();
    if (!thisRef) return false;
    uint32_t thisLen = thisRef.length();
    uint32_t totalLen = thisLen * count;
    resultValue = newString(totalLen);
    if (!resultValue) return false;
    {
        AssertNoGC noGC;
        const char *thisPtr = thisRef.getCStr(noGC, thisLength);
        const char *resPtr = thisRef.getCStr(noGC, resultValue);
        for (int i = 0; i < totalLen; i += thisLen) {
            std::memcpy(resPtr + i, thisPtr, thisLen);
        }
    }
    return true;
}
