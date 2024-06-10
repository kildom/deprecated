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

#include "wasm.hh"


#pragma region ------------------ CONSTANTS ------------------


static const uint32_t SHARED_CONTEXT_BUFFER_SIZE = 16 * 1024;


#pragma endregion


#pragma region ------------------ TYPES ------------------


struct Encodings {
    enum T : uint32_t {
        Utf8 = 0,
        Latin1 = 1,
        Utf16 = 2,
    };
    Encodings() = delete;
};

struct SandboxFlags {
    enum T : uint32_t {
        Latin1Allowed = 1,
        Utf16Allowed = 2,
    };
    SandboxFlags() = delete;
};

struct ExecuteFlags {
    enum T : uint32_t {
        Script = 0,
        Module = 1,
        TransferBufferOwnership = 2,
        ReturnValue = 4,
    };
    ExecuteFlags() = delete;
};


#pragma endregion


#pragma region ------------------ WASM IMPORTS ------------------


WASM_IMPORT(sandbox, entry) int entry();
WASM_IMPORT(sandbox, createBoolean) void createBoolean(bool value);
WASM_IMPORT(sandbox, createEngineError) void createEngineError(uint32_t encoding, const void* buffer, uint32_t size);
WASM_IMPORT(sandbox, keepValue) uint32_t keepValue();
WASM_IMPORT(sandbox, createArrayBuffer) void createArrayBuffer(const void* data, uint32_t size);
WASM_IMPORT(sandbox, createArrayBufferView) void createArrayBufferView(uint32_t type, uint32_t offset, uint32_t length);
WASM_IMPORT(sandbox, createError) void createError(uint32_t encoding, const void* buffer, uint32_t size);
WASM_IMPORT(sandbox, log) void logWasm(const void* str, uint32_t len);


#pragma endregion


#pragma region ------------------ GLOBAL VARIABLES ------------------


static JSContext* cx;
static SandboxFlags::T sandboxFlags;
static JS::PersistentRootedObject* globalObjectPtr;
#define globalObject (*globalObjectPtr)
static JS::PersistentRootedObject* sandboxObjectPtr;
#define sandboxObject (*sandboxObjectPtr)
static JS::PersistentRootedValue* sandboxValuePtr;
#define sandboxValue (*sandboxValuePtr)
static JSClass SandboxGlobalClass = { "SandboxGlobal", JSCLASS_GLOBAL_FLAGS, &JS::DefaultGlobalClassOps };
static uint8_t sharedBuffer[16 * 1024];


#pragma endregion


#pragma region ------------------ DEBUG LOGGING ------------------


static size_t char16len(const char16_t* str) {
    const char16_t* s;
    for (s = str; *s; ++s) {}
    return (s - str);
}

static void log(const char* format, ...)
{
    int size;
    {
        static char tmp[1];
        std::va_list args;
        size = vsnprintf(tmp, 1, format, args);
        va_end(args);
    }
    {
        char *ptr = (char*)malloc(size + 1);
        std::va_list args;
        va_start(args, format);
        size = vsnprintf(ptr, size + 1, format, args);
        va_end(args);
        logWasm(ptr, size);
        free(ptr);
    }
}


#pragma endregion


#pragma region ------------------ DATA SENDING FUNCTIONS ------------------


static bool createBooleanFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "createBoolean", 1)) return false;
    createBoolean(args[0].isTrue());
    return true;
}


#define NO_PARAMS_SANDBOX_FUNC(name) \
    WASM_IMPORT(sandbox, name) void name(); \
    static bool name##Func(JSContext* cx, unsigned argc, JS::Value* vp) { \
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
    static bool name##Func(JSContext* cx, unsigned argc, JS::Value* vp) { \
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
    static bool name##Func(JSContext* cx, unsigned argc, JS::Value* vp) { \
        return createStringTmpl(cx, argc, vp, name, #name); \
    }


static bool createArrayBufferFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
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


static bool createArrayBufferViewFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
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


static bool keepValueFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
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


static bool sendError(JS::HandleValue errorVal)
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

static bool createErrorFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "createError", 1)) return false;
    if (!sendError(args[0])) return false;
    return true;
}

#pragma endregion


#pragma region ------------------ ERROR REPORTING ------------------


static bool reportEngineError(const char* message) {
    clearValues();
    createEngineError(Encodings::Utf8, message, strlen(message));
    return false;
}

static bool reportPendingException()
{
    clearValues();

    JS::RootedValue errorValue(cx);
    bool ok = JS_GetPendingException(cx, &errorValue);
    JS_ClearPendingException(cx);

    if (ok) {
        sendError(errorValue);
    } else {
        return reportEngineError("Unknown error.");
    }

    return false;
}


#pragma endregion


#pragma region ------------------ SANDBOX OBJECT DEFINITIONS ------------------


static JSFunctionSpec sandboxFunctions[] = {
    JS_FN("clearValues", clearValuesFunc, 0, 0),
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
    JS_FN("createArrayBuffer", createArrayBufferFunc, 3, 0),
    JS_FN("createArrayBufferView", createArrayBufferViewFunc, 3, 0),
    JS_FN("reuseValue", reuseValueFunc, 1, 0),
    JS_FN("keepValue", keepValueFunc, 0, 0),
    JS_FS_END};


static bool DefineSandboxObject() {

    sandboxObjectPtr = new JS::PersistentRootedObject(cx, JS_NewObject(cx, nullptr));
    sandboxValuePtr = new JS::PersistentRootedValue(cx, JS::ObjectValue(*sandboxObject));

    if (!JS_DefineFunctions(cx, sandboxObject, sandboxFunctions)) return false;

    if (!JS_SetProperty(cx, globalObject, "__sandbox__", sandboxValue)) return false;

    return true;
}


#pragma endregion


#pragma region ------------------ CODE EXECUTION ------------------


WASM_EXPORT(execute)
bool execute(char* sourceCode, uint32_t sourceCodeSize, const char* fileName, ExecuteFlags::T flags)
{
    JSAutoRealm ar(cx, globalObject);
    JS::CompileOptions options(cx);
    options
        .setFileAndLine(fileName, 1)
        .setNoScriptRval(!(flags & ExecuteFlags::ReturnValue));
    if (flags & ExecuteFlags::Module) {
        options.setModule();
    }

    JS::SourceText<mozilla::Utf8Unit> source;
    if (!source.init(cx, sourceCode, sourceCodeSize, JS::SourceOwnership::Borrowed)) {
        if (flags && ExecuteFlags::TransferBufferOwnership) {
            JS_free(cx, sourceCode);
        }
        return reportEngineError("Cannot initialize.");
    }

    JS::RootedValue rval(cx);

    auto ok = JS::Evaluate(cx, options, source, &rval);

    if (flags & ExecuteFlags::TransferBufferOwnership) {
        JS_free(cx, sourceCode);
    }

    if (!ok) {
        return reportPendingException();
    }

    clearValues();

    if (flags & ExecuteFlags::ReturnValue) {
        JS::RootedValueArray<1> args(cx);
        args[0].set(rval);
        JS::RootedValue ignored(cx);
        if (!JS_CallFunctionName(cx, sandboxObject, "createHostValue", args, &ignored)) {
            return reportPendingException();
        }
    }

    return ok;
}


#pragma endregion


#pragma region ------------------ INITIALIZATION AND SANDBOX MANAGEMENT ------------------


WASM_EXPORT(malloc)
void* contextMalloc(uint32_t size)
{
    return JS_malloc(cx, size);
}


WASM_EXPORT(realloc)
void* contextRealloc(void* ptr, uint32_t oldSize, uint32_t newSize)
{
    return JS_realloc(cx, ptr, oldSize, newSize);
}


WASM_EXPORT(free)
void contextFree(void* ptr)
{
    JS_free(cx, ptr);
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

    globalObjectPtr = new JS::PersistentRootedObject(cx, JS_NewGlobalObject(cx, &SandboxGlobalClass, nullptr, JS::FireOnNewGlobalHook, options));

    if (!globalObject) {
        return false;
    }

    JSAutoRealm ar(cx, globalObject);

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


int main(int argc, const char* argv[]) {
    return entry();
}


extern "C"
pid_t getpid() { // For some reasons, WASI SDK is missing this function.
    return 1;
}


#pragma endregion
