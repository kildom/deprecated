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


WASM_IMPORT(sandbox, createBoolean) void createBoolean(bool value);
WASM_IMPORT(sandbox, createArrayBuffer) void createArrayBuffer(const void* data, uint32_t size);
WASM_IMPORT(sandbox, createArrayBufferView) void createArrayBufferView(uint32_t type, uint32_t offset, uint32_t length);
WASM_IMPORT(sandbox, keepValue) uint32_t keepValue();
WASM_IMPORT(sandbox, createError) void createError(uint32_t encoding, const void* buffer, uint32_t size);
WASM_IMPORT(sandbox, callToHost) bool callToHost(int32_t command);


static bool createBooleanJs(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "createBoolean", 1)) return false;
    createBoolean(args[0].isTrue());
    return true;
}


#define NO_PARAMS_SANDBOX_FUNC(name) \
    WASM_IMPORT(sandbox, name) void name(); \
    static bool name##Js(JSContext* cx, unsigned argc, JS::Value* vp) { \
        name(); \
        return true; \
    }


template<class CbkT>
static inline bool createNumberTmpl(JSContext* cx, unsigned argc, JS::Value* vp, CbkT callback, const char* name) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, name, 1)) return false;
    double num;
    if (!JS::ToNumber(cx, args[0], &num)) return false;
    callback(num);
    return true;
}

#define NUMBER_PARAM_SANDBOX_FUNC(name, T) \
    WASM_IMPORT(sandbox, name) void name(T value); \
    static bool name##Js(JSContext* cx, unsigned argc, JS::Value* vp) { \
        return createNumberTmpl(cx, argc, vp, name, #name); \
    }


template<class CbkT>
static inline bool createStringTmpl(JS::HandleString str, CbkT callback) {

    if ((sandboxFlags & SandboxFlags::Latin1Allowed) && JS::StringHasLatin1Chars(str)) {
        size_t len;
        JS::AutoCheckCannotGC nogc;
        const JS::Latin1Char* chars = JS_GetLatin1StringCharsAndLength(cx, nogc, str, &len);
        if (chars) {
            callback(Encodings::Latin1, (const char*)chars, len);
            return true;
        }
    } else if ((sandboxFlags & SandboxFlags::Utf16Allowed) && !JS::StringHasLatin1Chars(str)) {
        size_t len;
        JS::AutoCheckCannotGC nogc;
        const char16_t* chars = JS_GetTwoByteStringCharsAndLength(cx, nogc, str, &len);
        if (chars) {
            callback(Encodings::Utf16, chars, 2 * len);
            return true;
        }
    }

    uint32_t length = JS_GetStringLength(str);
    uint32_t allocSize;

    if (length <= SHARED_BUFFER_SIZE) {
        auto stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span((char*)sharedBuffer, SHARED_BUFFER_SIZE));
        if (stat.isNothing()) return false;
        auto read = std::get<0>(*stat);
        auto written = std::get<1>(*stat);
        if (read >= length) {
            callback(Encodings::Utf8, (char*)sharedBuffer, written);
            return true;
        }
        allocSize = 3 * length;
    } else {
        allocSize = 2 * length;
    }

    char* buffer = (char*)js_malloc(allocSize);
    if (!buffer) return false;
    auto stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span(buffer, allocSize));
    if (stat.isNothing()) {
        js_free(buffer);
        return false;
    }
    auto read = std::get<0>(*stat);
    auto written = std::get<1>(*stat);
    if (read >= length) {
        callback(Encodings::Utf8, buffer, written);
        js_free(buffer);
        return true;
    }
    uint32_t remaining = length - read;
    allocSize = written + 3 * remaining;
    js_free(buffer);
    buffer = (char*)js_malloc(allocSize);
    if (!buffer) return false;
    stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span(buffer, allocSize));
    if (stat.isNothing()) {
        js_free(buffer);
        return false;
    }
    read = std::get<0>(*stat);
    written = std::get<1>(*stat);
    if (read < length) {
        js_free(buffer);
        return false;
    }

    callback(Encodings::Utf8, buffer, written);
    return true;
}

template<class CbkT>
static inline bool createStringTmpl(JS::HandleValue strValue, CbkT callback) {
    JS::RootedString str(cx, strValue.toString());
    return createStringTmpl(str, callback);
}


template<class CbkT>
static inline bool createStringTmpl(JSContext* cx, unsigned argc, JS::Value* vp, CbkT callback, const char* name) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, name, 1)) return false;
    return createStringTmpl(args[0], callback);
}


#define STRING_PARAM_SANDBOX_FUNC(name) \
    WASM_IMPORT(sandbox, name) void name(uint32_t encoding, const void* buffer, uint32_t size); \
    static bool name##Js(JSContext* cx, unsigned argc, JS::Value* vp) { \
        return createStringTmpl(cx, argc, vp, name, #name); \
    }


static bool createArrayBufferJs(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "createArrayBuffer", 3)) return false;

    JS::RootedObject buffer(cx, &args[0].toObject());
    double offsetDouble;
    if (!JS::ToNumber(cx, args[1], &offsetDouble)) return false;
    double lengthDouble;
    if (!JS::ToNumber(cx, args[2], &lengthDouble)) return false;

    uint32_t requestedOffset = JS::ToInteger(offsetDouble);
    uint32_t requestedLength = JS::ToInteger(lengthDouble);

    size_t srcLength;
    uint8_t* srcData;

    auto obj = GetObjectAsArrayBuffer(buffer, &srcLength, &srcData);
    if (!obj) return false;

    createArrayBuffer(srcData + requestedOffset, requestedLength);

    return true;
}


static bool createArrayBufferViewJs(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "createArrayBufferView", 3)) return false;

    double typeDouble;
    if (!JS::ToNumber(cx, args[0], &typeDouble)) return false;
    double offsetDouble;
    if (!JS::ToNumber(cx, args[1], &offsetDouble)) return false;
    double lengthDouble;
    if (!JS::ToNumber(cx, args[2], &lengthDouble)) return false;

    uint32_t type = JS::ToInteger(typeDouble);
    uint32_t offset = JS::ToInteger(offsetDouble);
    uint32_t length = JS::ToInteger(lengthDouble);

    createArrayBufferView(type, offset, length);

    return true;
}


static bool keepValueJs(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    auto index = keepValue();
    args.rval().setNumber(index);
    return true;
}


NO_PARAMS_SANDBOX_FUNC(clearValues);
NO_PARAMS_SANDBOX_FUNC(createNull);
NO_PARAMS_SANDBOX_FUNC(createUndefined);
NO_PARAMS_SANDBOX_FUNC(createArray);
NO_PARAMS_SANDBOX_FUNC(createObject);

NUMBER_PARAM_SANDBOX_FUNC(createNumber, double);
NUMBER_PARAM_SANDBOX_FUNC(createDate, double);
NUMBER_PARAM_SANDBOX_FUNC(createRegExp, uint32_t);
NUMBER_PARAM_SANDBOX_FUNC(createArrayItem, uint32_t);
NUMBER_PARAM_SANDBOX_FUNC(reuseValue, uint32_t);

STRING_PARAM_SANDBOX_FUNC(createString);
STRING_PARAM_SANDBOX_FUNC(createObjectProperty);
STRING_PARAM_SANDBOX_FUNC(createBigInt);


bool sendError(JS::HandleValue errorVal)
{
    if (errorVal.isObject()) {
        JS::RootedObject errorObj(cx, &errorVal.toObject());
        auto stack = ExceptionStackOrNull(errorObj);
        if (stack) {
            JS::RootedObject stackObj(cx, stack);
            JS::RootedValue stackVal(cx, JS::ObjectValue(*stackObj));
            JS::RootedString stackStr(cx, JS::ToString(cx, stackVal));
            createStringTmpl(stackStr, createString);
        } else {
            createUndefined();
        }
        JS::RootedValue nameValue(cx);
        if (!JS_GetProperty(cx, errorObj, "name", &nameValue)) return false;
        createStringTmpl(nameValue, createString);
    } else {
        createUndefined();
        createUndefined();
    }

    JS::RootedString str(cx, JS::ToString(cx, errorVal));
    if (!str) return false;
    createStringTmpl(str, createError);

    return true;
}

static bool createErrorJs(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "createError", 1)) return false;
    if (!sendError(args[0])) return false;
    return true;
}


static bool callToHostJs(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "callToHost", 1)) return false;
    double num;
    if (!JS::ToNumber(cx, args[0], &num)) return false;
    int32_t command = num;
    bool ok = callToHost(command);
    args.rval().setBoolean(ok);
    return true;
}


JSFunctionSpec sandboxSendFunctions[] = {
    JS_FN("clearValues", clearValuesJs, 0, 0),
    JS_FN("createNull", createNullJs, 0, 0),
    JS_FN("createUndefined", createUndefinedJs, 0, 0),
    JS_FN("createError", createErrorJs, 1, 0),
    JS_FN("createArray", createArrayJs, 0, 0),
    JS_FN("createObject", createObjectJs, 0, 0),
    JS_FN("createBigInt", createBigIntJs, 0, 0),
    JS_FN("createNumber", createNumberJs, 1, 0),
    JS_FN("createDate", createDateJs, 1, 0),
    JS_FN("createRegExp", createRegExpJs, 1, 0),
    JS_FN("createArrayItem", createArrayItemJs, 1, 0),
    JS_FN("createString", createStringJs, 1, 0),
    JS_FN("createObjectProperty", createObjectPropertyJs, 1, 0),
    JS_FN("createBigInt", createBigIntJs, 1, 0),
    JS_FN("createBoolean", createBooleanJs, 1, 0),
    JS_FN("createArrayBuffer", createArrayBufferJs, 3, 0),
    JS_FN("createArrayBufferView", createArrayBufferViewJs, 3, 0),
    JS_FN("reuseValue", reuseValueJs, 1, 0),
    JS_FN("keepValue", keepValueJs, 0, 0),
    JS_FN("callToHost", callToHostJs, 1, 0),
    JS_FS_END};

