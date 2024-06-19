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
#include <js/GCAPI.h>

#include "wasm.h"
#include "sandbox.h"
#include "send.h"


#pragma region ------------------ GLOBAL VARIABLES ------------------


JSContext* cx;
SandboxFlags::T sandboxFlags;
uint8_t sharedBuffer[SHARED_BUFFER_SIZE];
DynamicContext* dx;

static JSClass SandboxGlobalClass = { "SandboxGlobal", JSCLASS_GLOBAL_FLAGS, &JS::DefaultGlobalClassOps };


#pragma endregion


#pragma region ------------------ WASM IMPORTS ------------------


WASM_IMPORT(sandbox, entry) int entry();
WASM_IMPORT(sandbox, createEngineError) void createEngineError(uint32_t encoding, const void* buffer, uint32_t size);
WASM_IMPORT(sandbox, log) void logWasm(const void* str, uint32_t len);
WASM_IMPORT(sandbox, callToHost) bool callToHost(int32_t command);


#pragma endregion


#pragma region ------------------ DEBUG LOGGING ------------------


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


#pragma region ------------------ ERROR REPORTING ------------------


bool reportEngineError(const char* message) {
    clearValues();
    createEngineError(Encodings::Utf8, message, strlen(message));
    return false;
}

void reportPendingException()
{
    clearValues();

    JS::RootedValue errorValue(cx);
    bool ok = JS_GetPendingException(cx, &errorValue);
    JS_ClearPendingException(cx);

    if (ok) {
        ok = sendError(errorValue);
    }

    if (!ok) {
        reportEngineError("Unknown error.");
    }
}


#pragma endregion


#pragma region ------------------ SANDBOX OBJECT DEFINITIONS ------------------


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

static bool doGarbageCollection(JSContext* cx, unsigned argc, JS::Value* vp) {
    NonIncrementalGC(cx, JS::GCOptions::Normal, JS::GCReason::API);
    return true;
}

JSFunctionSpec sandboxGeneralFunctions[] = {
    JS_FN("callToHost", callToHostJs, 1, 0),
    JS_FN("gc", doGarbageCollection, 1, 0),
    JS_FS_END};


static bool defineSandboxObject()
{
    dx->sandboxObject.set(JS_NewObject(cx, nullptr));
    dx->sandboxValue.setObject(*dx->sandboxObject);
    dx->recvObject.set(JS_NewObject(cx, nullptr));
    dx->recvValue.setObject(*dx->recvObject);

    if (!JS_SetProperty(cx, dx->globalObject, "__sandbox__", dx->sandboxValue)) return false;
    if (!JS_SetProperty(cx, dx->sandboxObject, "recv", dx->recvValue)) return false;
    if (!JS_DefineFunctions(cx, dx->sandboxObject, sandboxSendFunctions)) return false;
    if (!JS_DefineFunctions(cx, dx->sandboxObject, sandboxGeneralFunctions)) return false;

    return true;
}


#pragma endregion


#pragma region ------------------ CODE EXECUTION ------------------


WASM_EXPORT(execute)
bool execute(char* sourceCode, uint32_t sourceCodeSize, const char* fileName, ExecuteFlags::T flags)
{
    JSAutoRealm ar(cx, dx->globalObject);
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
        reportPendingException();
        return false;
    }

    clearValues();

    if (flags & ExecuteFlags::ReturnValue) {
        JS::RootedValueArray<1> args(cx);
        args[0].set(rval);
        JS::RootedValue ignored(cx);
        if (!JS_CallFunctionName(cx, dx->sandboxObject, "createHostValue", args, &ignored)) {
            reportPendingException();
            return false;
        }
    }

    return true;
}


WASM_EXPORT(call)
bool call(int32_t command)
{
    JSAutoRealm ar(cx, dx->globalObject);
    JS::RootedValueArray<1> args(cx);
    args[0].setNumber(command);
    JS::RootedValue ignore(cx);
    if (!JS_CallFunctionName(cx, dx->sandboxObject, "callFromHost", args, &ignore)) {
        reportPendingException();
        return false;
    }
    return true;
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

    cx = JS_NewContext(heapSizeLimit);
    if (!cx) {
        return false;
    }

    if (!JS::InitSelfHostedCode(cx)) {
        return false;
    }

    /* TODO: Below GC parameters does not work properly.
    * We need hard heap limit. Possible solution:
    * 1. In function (constructor) that blocks GC:
    *    * if counter == 1 (this is first entry to GC-disabled scope)
    *    * and if heapSize > currentThreshold then call triggerHardGC()
    *    (we don't need to check after exiting from GC-disabled scope,
    *    because we will check it just before allocating anything or
    *    entering GC-disabled scope again).
    * 2. Before allocating anything:
    *    * if GC is not blocked
    *    * and if heapSize > currentThreshold then call triggerHardGC()
    *
    * triggerHardGC():
    *   * exit if GC is not possible, there may be more conditions
    *     than just GC-disabled scope.
    *   * do partial GC, e.g. minor GC (if this is possible)
    *     (skip partial GC once everything N times, this will ensure that full GC is
    *     executed sometimes).
    *   * if heapSize <= currentThreshold:
    *       * currentThreshold = min(currentThreshold, calcCurrentThreshold())
    *       * return
    *   * do full GC (with deallocating caches if heapSize above some bigger threshold)
    *   * if full GC was actually done (not rejected)
    *       * currentThreshold = calcCurrentThreshold()
    * 
    * calcCurrentThreshold():
    *   * inputs:
    *       * heapSize
    *       * aggressiveGCThreshold - heap size when aggressive GC starts working
    *       * hardThreshold - heap size when GC works all the time
    *   return max(aggressiveGCThreshold, k * heapSize + (1 - k) * hardThreshold)
    *   where k is parameter from 0 to 1 tells how aggressive approach is used
    *   when we are are close to the limit.
    *       0.5 - almost not aggressive
    *       0.75 - pretty optimal value
    *       0.9 - very aggressive
    */
    //JS_SetGCParameter(cx, JSGC_INCREMENTAL_GC_ENABLED, 0);
    //JS_SetGCParameter(cx, JSGC_MAX_BYTES, heapSizeLimit);
    //JS_SetGCParameter(cx, JSGC_ALLOCATION_THRESHOLD, 32);
    //JS_SetGCParameter(cx, JSGC_BALANCED_HEAP_LIMITS_ENABLED, 0);
    //JS_SetGCParameter(cx, JSGC_PER_ZONE_GC_ENABLED, 0);
    //JS::AutoDisableGenerationalGC noggc(cx);

    JS::RealmOptions options;
    JS::RootedObject globalObject(cx, JS_NewGlobalObject(cx, &SandboxGlobalClass, nullptr, JS::FireOnNewGlobalHook, options));

    if (!globalObject) {
        return false;
    }

    JSAutoRealm ar(cx, globalObject);

    dx = new DynamicContext(cx);
    dx->globalObject.set(globalObject);

    if (!defineSandboxObject()) {
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
    return SHARED_BUFFER_SIZE;
}


int main(int argc, const char* argv[]) {
    if (!JS_Init()) {
        return 1;
    }
    return entry();
}


extern "C"
pid_t getpid() { // For some reasons, WASI SDK is missing this function.
    return 1;
}


#pragma endregion
