#include <stdint.h>

#include <jsapi.h>
#include <js/Initialization.h>
#include <js/Exception.h>
#include <js/CompilationAndEvaluation.h>
#include <js/SourceText.h>
#include <js/Conversions.h>
#include <js/MemoryFunctions.h>
#include <js/Exception.h>
#include <js/ArrayBuffer.h>

#include "wasm.h"
#include "sandbox.h"
#include "send.h"


static const char* const recvErrorIsFromGuest = "<guest>";
static const char* recvErrorState = nullptr;


static void takePendingRecvError() {
    recvErrorState = recvErrorIsFromGuest;
    JS::RootedValue errorValue(cx);
    bool ok = JS_GetPendingException(cx, &errorValue);
    JS_ClearPendingException(cx);
    if (ok) {
        dx->recvPendingErrorValue.set(errorValue);
    } else {
        recvErrorState = "Unknown error.";
    }
}

template<class T>
static inline void createValueTail(const char* name, T& args) {
    JS::RootedValue ignored(cx);
    if (!JS_CallFunctionName(cx, dx->recvObject, name, args, &ignored)) takePendingRecvError();
}

#define NO_PARAMS_RECV_GUEST_FUNC(name) \
    WASM_EXPORT(name) \
    void name##Guest() { \
        if (recvErrorState) return; \
        JSAutoRealm ar(cx, dx->globalObject); \
        JS::RootedValueArray<0> args(cx); \
        createValueTail(#name, args); \
    }

NO_PARAMS_RECV_GUEST_FUNC(createNull);
NO_PARAMS_RECV_GUEST_FUNC(createArray);
NO_PARAMS_RECV_GUEST_FUNC(createUndefined);
NO_PARAMS_RECV_GUEST_FUNC(createObject);


#define NUM_PARAM_RECV_GUEST_FUNC(name) \
    WASM_EXPORT(name) \
    void name##Guest(double value) { \
        if (recvErrorState) return; \
        JSAutoRealm ar(cx, dx->globalObject); \
        JS::RootedValueArray<1> args(cx); \
        args[0].setNumber(value); \
        createValueTail(#name, args); \
    }

NUM_PARAM_RECV_GUEST_FUNC(createNumber);
NUM_PARAM_RECV_GUEST_FUNC(createDate);
NUM_PARAM_RECV_GUEST_FUNC(createRegExp);
NUM_PARAM_RECV_GUEST_FUNC(createArrayItem);
NUM_PARAM_RECV_GUEST_FUNC(reuseValue);


static JSString* recvDecodeString(const char* buffer, uint32_t size, Encodings::T encoding)
{
    // TODO: More optimized version with long strings is possible using JS_NewExternalStringLatin1 if caller provided Latin1 flag and it is not shared buffer.
    switch (encoding)
    {
    case Encodings::Utf8:
        return JS_NewStringCopyUTF8N(cx, JS::UTF8Chars(buffer, size));
    case Encodings::Latin1:
        return JS_NewStringCopyN(cx, buffer, size);
    default:
        recvErrorState = "Unsupported encoding.";
        return JS_NewStringCopyZ(cx, "");
    }
}


#define STR_PARAM_RECV_GUEST_FUNC(name) \
    WASM_EXPORT(name) \
    void name##Guest(const char* buffer, uint32_t size, Encodings::T encoding) \
    { \
        if (recvErrorState) return; \
        JSAutoRealm ar(cx, dx->globalObject); \
        JS::RootedValueArray<1> args(cx); \
        args[0].setString(recvDecodeString(buffer, size, encoding)); \
        createValueTail(#name, args); \
    }

STR_PARAM_RECV_GUEST_FUNC(createString);
STR_PARAM_RECV_GUEST_FUNC(createError);
STR_PARAM_RECV_GUEST_FUNC(createBigInt);
STR_PARAM_RECV_GUEST_FUNC(createObjectProperty);


WASM_EXPORT(clearValues)
void clearValuesGuest() {
    JSAutoRealm ar(cx, dx->globalObject);
    recvErrorState = nullptr;
    dx->recvPendingErrorValue.setUndefined();
    JS::RootedValueArray<0> args(cx);
    createValueTail("clearValues", args);
}


WASM_EXPORT(createBoolean)
void createBooleanGuest(int32_t value) {
    if (recvErrorState) return;
    JSAutoRealm ar(cx, dx->globalObject);
    JS::RootedValueArray<1> args(cx);
    args[0].setBoolean(value ? true : false);
    createValueTail("createBoolean", args);
}

WASM_EXPORT(createArrayBuffer)
void createArrayBufferGuest(void* buffer, int32_t size) {
    if (recvErrorState) return;
    JSAutoRealm ar(cx, dx->globalObject);
    JS::RootedValueArray<1> args(cx);
    mozilla::UniquePtr<uint8_t[], JS::FreePolicy> bufferUnique(static_cast<uint8_t*>(buffer));
    args[0].setObject(*JS::NewArrayBufferWithContents(cx, size, std::move(bufferUnique)));
    createValueTail("createArrayBuffer", args);
}

WASM_EXPORT(createArrayBufferView)
void createArrayBufferViewGuest(uint32_t type, uint32_t offset, uint32_t size) {
    if (recvErrorState) return;
    JSAutoRealm ar(cx, dx->globalObject);
    JS::RootedValueArray<3> args(cx);
    args[0].setNumber(type);
    args[1].setNumber(offset);
    args[2].setNumber(size);
    createValueTail("createArrayBufferView", args);
}

WASM_EXPORT(keepValue)
uint32_t keepValueGuest() {
    if (recvErrorState) return 0;
    JSAutoRealm ar(cx, dx->globalObject);
    JS::RootedValueArray<0> args(cx);
    JS::RootedValue result(cx);
    if (!JS_CallFunctionName(cx, dx->recvObject, "keepValue", args, &result)) {
        takePendingRecvError();
        return 0;
    }
    double num;
    if (!JS::ToNumber(cx, result, &num)) {
        takePendingRecvError();
        return 0;
    }
    return (uint32_t)num;
}

WASM_EXPORT(getRecvError)
bool getRecvErrorGuest()
{
    JSAutoRealm ar(cx, dx->globalObject);

    if (recvErrorState) {
        if (recvErrorState == recvErrorIsFromGuest) {
            clearValues();
            sendError(dx->recvPendingErrorValue);
        } else {
            reportEngineError(recvErrorState);
        }
        return false;
    }

    JS::RootedValueArray<0> args(cx);
    JS::RootedValue result(cx);
    if (!JS_CallFunctionName(cx, dx->recvObject, "getRecvError", args, &result)) {
        reportPendingException();
        return false;
    }

    if (!result.isNull() && !result.isUndefined()) {
        clearValues();
        sendError(result);
        return false;
    }

    return true;
}
