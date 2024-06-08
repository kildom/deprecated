#include <stdint.h>

#include <jsapi.h>
#include <js/Initialization.h>
#include <js/Exception.h>
#include <js/CompilationAndEvaluation.h>
#include <js/SourceText.h>
#include <js/Conversions.h>
#include <js/MemoryFunctions.h>

#include "wasm.hh"


#pragma region ================== CONSTANTS ==================


static const uint32_t SHARED_CONTEXT_BUFFER_SIZE = 16 * 1024;


#pragma endregion


#pragma region ================== TYPES ==================


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


#pragma region ================== WASM IMPORTS ==================


WASM_IMPORT(sandbox, entry) int entry();
WASM_IMPORT(sandbox, createBoolean) void createBoolean(bool value);


#pragma endregion


#pragma region ================== GLOBAL VARIABLES ==================


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


#pragma region ================== DATA SENDING FUNCTIONS ==================


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
NO_PARAMS_SANDBOX_FUNC(createArray);
NO_PARAMS_SANDBOX_FUNC(createObject);

NUMBER_PARAM_SANDBOX_FUNC(createNumber, double);
NUMBER_PARAM_SANDBOX_FUNC(createDate, double);
NUMBER_PARAM_SANDBOX_FUNC(createRegExp, uint32_t);
NUMBER_PARAM_SANDBOX_FUNC(createArrayItem, uint32_t);

STRING_PARAM_SANDBOX_FUNC(createString);
STRING_PARAM_SANDBOX_FUNC(createObjectProperty);
STRING_PARAM_SANDBOX_FUNC(createBigInt);
STRING_PARAM_SANDBOX_FUNC(createError);


#pragma endregion


#pragma region ================== SANDBOX OBJECT DEFINITIONS ==================


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

    sandboxObjectPtr = new JS::PersistentRootedObject(cx, JS_NewObject(cx, nullptr));
    sandboxValuePtr = new JS::PersistentRootedValue(cx, JS::ObjectValue(*sandboxObject));

    if (!JS_DefineFunctions(cx, sandboxObject, sandboxFunctions)) return false;

    if (!JS_SetProperty(cx, globalObject, "__sandbox__", sandboxValue)) return false;

    return true;
}


#pragma endregion


#pragma region ================== CODE EXECUTION ==================


WASM_EXPORT(execute)
bool execute(char* buffer, uint32_t size, ExecuteFlags::T flags)
{
    auto fileName = buffer;
    auto fileNameSize = strlen(fileName) + 1;
    auto sourceCode = buffer + fileNameSize;
    auto soueceCodeSize = size - fileNameSize;

    JSAutoRealm ar(cx, globalObject);
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
        //if (ok) sendValue(rval);
        // TODO: Send exception
        return false;
    }

    cleanValues();

    if (flags & ExecuteFlags::ReturnValue) {
        //sendValue(rval);
        // TODO: Send rval
    }

    return ok;
}


#pragma endregion


#pragma region ================== INITIALIZATION AND SANDBOX MANAGEMENT ==================


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
