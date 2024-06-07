#include <stdint.h>
#include <jsapi.h>
#include <js/Initialization.h>
#include <js/Exception.h>
#include <js/CompilationAndEvaluation.h>
#include <js/SourceText.h>
#include <js/Conversions.h>
#include <js/MemoryFunctions.h>

#include "wasm.hh"

static const uint32_t SHARED_CONTEXT_BUFFER_SIZE = 16 * 1024;

struct Encodings {
    enum T : uint32_t {
        Utf8 = 0,
        Latin1 = 1,
        Utf16 = 2,
    };
private:
    Encodings(){}
};

struct SandboxFlags {
    enum T : uint32_t {
        Latin1Allowed = 1,
        Utf16Allowed = 2,
    };
private:
    SandboxFlags(){}
};


struct ExecuteFlags {
    enum T : uint32_t {
        Script = 0,
        Module = 1,
        TransferBufferOwnership = 2,
        ReturnValue = 4,
    };
private:
    ExecuteFlags(){}
};


static SandboxFlags::T sandboxFlags;
static JSContext* cx;
static JS::PersistentRootedObject* globalPtr;
#define global (*globalPtr)
static JSClass SandboxGlobalClass = { "SandboxGlobal", JSCLASS_GLOBAL_FLAGS, &JS::DefaultGlobalClassOps };
static uint8_t sharedBuffer[16 * 1024];


WASM_IMPORT(sandbox, entry) int entry();
WASM_IMPORT(sandbox, createBoolean) void createBoolean(bool value);
WASM_IMPORT(sandbox, setErrorState) void setErrorState(const char* buffer, uint32_t size);

static void sendValue(JS::HandleValue value);

#define NO_PARAMS_SANDBOX_FUNC(name) \
    WASM_IMPORT(sandbox, name) void name(); \
    static bool name##Func(JSContext* cx, unsigned argc, JS::Value* vp) { \
        name(); \
        return true; \
    }

template<class CbkT>
static inline bool numberFunctionTemplate(JSContext* cx, unsigned argc, JS::Value* vp, CbkT callback, const char* name) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, name, 1)) return false;
    double num;
    if (!JS::ToNumber(cx, args[0], &num)) return false;
    callback(num);
    return true;
}


#define NUMBER_PARAM_SANDBOX_FUNC(name, T) \
    WASM_IMPORT(sandbox, name) void name(T value); \
    static bool name##Func(JSContext* cx, unsigned argc, JS::Value* vp) { \
        return numberFunctionTemplate(cx, argc, vp, name, #name); \
    }


template<class CbkT>
static inline bool stringFunctionTemplate(JSContext* cx, unsigned argc, JS::Value* vp, CbkT callback, const char* name) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, name, 1)) return false;

    JS::RootedString str(cx, args[0].toString());

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

    if (length <= SHARED_CONTEXT_BUFFER_SIZE) {
        auto stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span((char*)sharedBuffer, SHARED_CONTEXT_BUFFER_SIZE));
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

#define STRING_PARAM_SANDBOX_FUNC(name) \
    WASM_IMPORT(sandbox, name) void name(uint32_t encoding, const void* buffer, uint32_t size); \
    static bool name##Func(JSContext* cx, unsigned argc, JS::Value* vp) { \
        return stringFunctionTemplate(cx, argc, vp, name, #name); \
    }


NO_PARAMS_SANDBOX_FUNC(cleanValues);
NO_PARAMS_SANDBOX_FUNC(createNull);
NO_PARAMS_SANDBOX_FUNC(createUndefined);
NO_PARAMS_SANDBOX_FUNC(createError);
NO_PARAMS_SANDBOX_FUNC(createArray);
NO_PARAMS_SANDBOX_FUNC(createObject);

NUMBER_PARAM_SANDBOX_FUNC(createNumber, double);
NUMBER_PARAM_SANDBOX_FUNC(createDate, double);
NUMBER_PARAM_SANDBOX_FUNC(createRegExp, uint32_t);
NUMBER_PARAM_SANDBOX_FUNC(createArrayItem, uint32_t);

STRING_PARAM_SANDBOX_FUNC(createString);
STRING_PARAM_SANDBOX_FUNC(createObjectProperty);
STRING_PARAM_SANDBOX_FUNC(createBigInt);


static bool createBooleanFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "createBoolean", 1)) return false;
    createBoolean(args[0].isTrue());
    return true;
}

static JSFunctionSpec sandboxFunctions[] = {
    JS_FN("cleanValues", cleanValuesFunc, 0, 0),
    JS_FN("createNull", createNullFunc, 0, 0),
    JS_FN("createUndefined", createUndefinedFunc, 0, 0),
    JS_FN("createError", createErrorFunc, 0, 0),
    JS_FN("createArray", createArrayFunc, 0, 0),
    JS_FN("createObject", createObjectFunc, 0, 0),
    JS_FN("createBigInt", createBigIntFunc, 0, 0),
    JS_FN("createNumber", createNumberFunc, 1, 0),
    JS_FN("createDate", createDateFunc, 1, 0),
    JS_FN("createRegExp", createRegExpFunc, 1, 0),
    JS_FN("createArrayItem", createArrayItemFunc, 1, 0),
    JS_FN("createString", createStringFunc, 1, 0),
    JS_FN("createObjectProperty", createObjectPropertyFunc, 1, 0),
    JS_FN("createBigInt", createBigIntFunc, 1, 0),
    JS_FN("createBoolean", createBooleanFunc, 1, 0),
    JS_FS_END};


static bool DefineSandboxObject() {

    JS::RootedObject sandbox(cx, JS_NewObject(cx, nullptr));
    JS::RootedValue valSandbox(cx, JS::ObjectValue(*sandbox));

    if (!JS_DefineFunctions(cx, sandbox, sandboxFunctions)) return false;

    if (!JS_SetProperty(cx, global, "__sandbox__", valSandbox)) return false;

    return true;
}



WASM_EXPORT(init)
bool init(uint32_t heapSizeLimit, SandboxFlags::T flags)
{
    sandboxFlags = flags;

    if (!JS_Init()) {
        return false;
    }

    cx = JS_NewContext(heapSizeLimit);
    if (!cx) {
        return false;
    }

    if (!JS::InitSelfHostedCode(cx)) {
        return false;
    }

    JS::RealmOptions options;

    globalPtr = new JS::PersistentRootedObject(cx, JS_NewGlobalObject(cx, &SandboxGlobalClass, nullptr, JS::FireOnNewGlobalHook, options));

    if (!global) {
        return false;
    }

    JSAutoRealm ar(cx, global);

    if (!DefineSandboxObject()) {
        return false;
    }

    return true;
}


WASM_EXPORT(getSharedBufferPointer)
uint8_t* getSharedBufferPointer()
{
    return sharedBuffer;
}

WASM_EXPORT(getSharedBufferSize)
uint32_t getSharedBufferSize()
{
    return SHARED_CONTEXT_BUFFER_SIZE;
}

static void sendStringValue(JS::HandleString str) {

    if ((sandboxFlags & SandboxFlags::Latin1Allowed) && JS::StringHasLatin1Chars(str)) {
        size_t len;
        JS::AutoCheckCannotGC nogc;
        const JS::Latin1Char* chars = JS_GetLatin1StringCharsAndLength(cx, nogc, str, &len);
        if (chars) {
            //createStringLatin1((const char*)chars, len);
            return;
        }
    } else if ((sandboxFlags & SandboxFlags::Utf16Allowed) && !JS::StringHasLatin1Chars(str)) {
        size_t len;
        JS::AutoCheckCannotGC nogc;
        const char16_t* chars = JS_GetTwoByteStringCharsAndLength(cx, nogc, str, &len);
        if (chars) {
            //createStringUtf16(chars, 2 * len);
            return;
        }
    }

    uint32_t length = JS_GetStringLength(str);
    uint32_t allocSize;

    if (length <= SHARED_CONTEXT_BUFFER_SIZE) {
        auto stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span((char*)sharedBuffer, SHARED_CONTEXT_BUFFER_SIZE));
        if (stat.isNothing()) {
            setErrorState("Unknown string encoding error.", 30);
            return;
        }
        auto read = std::get<0>(*stat);
        auto written = std::get<1>(*stat);
        if (read >= length) {
            //createStringUtf8((char*)sharedBuffer, written);
            return;
        }
        allocSize = 3 * length;
    } else {
        allocSize = 2 * length;
    }

    char* buffer = (char*)js_malloc(allocSize);
    if (!buffer) {
        setErrorState("Out of memory.", 14);
        return;
    }
    auto stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span(buffer, allocSize));
    if (stat.isNothing()) {
        js_free(buffer);
        setErrorState("Unknown string encoding error.", 30);
        return;
    }
    auto read = std::get<0>(*stat);
    auto written = std::get<1>(*stat);
    if (read >= length) {
        //createStringUtf8(buffer, written);
        js_free(buffer);
        return;
    }
    uint32_t remaining = length - read;
    allocSize = written + 3 * remaining;
    js_free(buffer);
    buffer = (char*)js_malloc(allocSize);
    stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span(buffer, allocSize));
    if (stat.isNothing()) {
        js_free(buffer);
        setErrorState("Unknown string encoding error.", 30);
        return;
    }
    read = std::get<0>(*stat);
    written = std::get<1>(*stat);
    if (read >= length) {
        //createStringUtf8(buffer, written);
    } else {
        setErrorState("Unknown string encoding error.", 30);
    }
    js_free(buffer);
}


bool isInstanceOf(JS::HandleValue obj, JSProtoKey protoKey) {
    JS::RootedObject classObj(cx);
    if (!JS_GetClassObject(cx, protoKey, &classObj)) {
        setErrorState("Object encoding error.", 22);
        return false;
    }
    bool result;
    if (!JS_HasInstance(cx, classObj, obj, &result)) {
        setErrorState("Object encoding error.", 22);
        return false;
    }
    return result;
}

static JSProtoKey getKnownStandardInstance(JS::HandleObject obj) {
    JS::RootedObject current(cx, obj);
    do {
        JSProtoKey key = JS::IdentifyStandardInstanceOrPrototype(current);
        switch (key)
        {
            case JSProto_Object:
            case JSProto_Date:
            case JSProto_RegExp:
            case JSProto_Error:
            case JSProto_Map:
            case JSProto_Set:
                return key;
            case JSProto_ArrayBuffer:
            case JSProto_SharedArrayBuffer:
                return JSProto_ArrayBuffer;
            case JSProto_Int8Array:
            case JSProto_Uint8Array:
            case JSProto_Int16Array:
            case JSProto_Uint16Array:
            case JSProto_Int32Array:
            case JSProto_Uint32Array:
            case JSProto_Float32Array:
            case JSProto_Float64Array:
            case JSProto_Uint8ClampedArray:
            case JSProto_BigInt64Array:
            case JSProto_BigUint64Array:
            case JSProto_DataView:
                return JSProto_DataView;
            case JSProto_Null:
                return JSProto_Object;
            default:
                break;
        }
        JS::RootedObject next(cx);
        if (!JS_GetPrototype(cx, current, &next)) {
            return JSProto_Object;
        }
        current = std::move(next);
    } while (true);
}


static void sendObjectValue(JS::HandleValue value) {

    JS::RootedObject obj(cx, &value.toObject());

    switch (getKnownStandardInstance(obj)) {

        case JSProto_Date: {
            JS::RootedValue rval(cx);
            JS_CallFunctionName(cx, obj, "getTime", JS::HandleValueArray::empty(), &rval);
            double time;
            if (!JS::ToNumber(cx, rval, &time)) goto error_return;
            //createDate();
            break;
        }

        case JSProto_RegExp: {
            JS::RootedValue rval(cx);
            if (!JS_GetProperty(cx, obj, "source", &rval)) goto error_return;
            sendValue(rval);
            if (!JS_GetProperty(cx, obj, "flags", &rval)) goto error_return;
            sendValue(rval);
            if (!JS_GetProperty(cx, obj, "lastIndex", &rval)) goto error_return;
            double lastIndex;
            if (!JS::ToNumber(cx, rval, &lastIndex)) goto error_return;
            //createRegExp();
            break;
        }

        case JSProto_Error: {
            JS::RootedValue rval(cx);
            if (!JS_GetProperty(cx, obj, "message", &rval)) goto error_return;
            sendValue(rval);
            createError();
            break;
        }

        default:
            break;
    }
    return;

error_return:
    setErrorState("Object encoding error.", 22);
}

static void sendValue(JS::HandleValue value) {
    if (value.isNull()) {
        createNull();
    } else if (value.isBoolean()) {
        createBoolean(value.isTrue());
    } else if (value.isString()) {
        JS::RootedString str(cx, value.toString());
        sendStringValue(str);
    } else if (value.isNumber()) {
        double num;
        if (!JS::ToNumber(cx, value, &num)) {
            setErrorState("Number encoding error.", 22);
        } else {
            createNumber(num);
        }
    } else if (value.isObject()) {
        sendObjectValue(value);
    } else {
        createUndefined();
    }
}

WASM_EXPORT(execute)
bool execute(char* buffer, uint32_t size, ExecuteFlags::T flags)
{
    auto fileName = buffer;
    auto fileNameSize = strlen(fileName) + 1;
    auto sourceCode = buffer + fileNameSize;
    auto soueceCodeSize = size - fileNameSize;

    JSAutoRealm ar(cx, global);
    JS::CompileOptions options(cx);
    options
        .setFileAndLine(fileName, 1)
        .setNoScriptRval(!(flags & ExecuteFlags::ReturnValue));
    if (flags & ExecuteFlags::Module) {
        options.setModule();
    }

    JS::SourceText<mozilla::Utf8Unit> source;
    if (!source.init(cx, sourceCode, soueceCodeSize, JS::SourceOwnership::Borrowed)) {
        if (flags && ExecuteFlags::TransferBufferOwnership) {
            JS_free(cx, buffer);
        }
        cleanValues();
        return false;
    }

    JS::RootedValue rval(cx);

    auto ok = JS::Evaluate(cx, options, source, &rval);

    if (flags && ExecuteFlags::TransferBufferOwnership) {
        JS_free(cx, buffer);
    }

    if (!ok) {
        ok = JS_GetPendingException(cx, &rval);
        JS_ClearPendingException(cx);
        cleanValues();
        if (ok) sendValue(rval);
        return false;
    }

    cleanValues();

    if (flags & ExecuteFlags::ReturnValue) {
        sendValue(rval);
    }

    return ok;
}


int main(int argc, const char* argv[]) {
    return entry();
}


extern "C"
pid_t getpid() {
    return 1;
}
