#include <stdint.h>
#include <algorithm>

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

const uint32_t MIN_THRESHOLD_INCREMENT = 8 * 1024;


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
    int size = 1024;
    if (0) {
        static char tmp[1];
        std::va_list args;
        size = vsnprintf(tmp, 1, format, args) + 1024;
        va_end(args);
    }
    {
        char *ptr = (char*)malloc(size + 1);
        if (!ptr) {
            logWasm("malloc failed!", 14);
            return;
        }
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


WASM_IMPORT(sandbox, getMemorySize) uint32_t getMemorySize();
WASM_IMPORT(sandbox, getStackPointer) uint32_t getStackPointer();

static uint32_t memoryLimit;
static uint32_t aggressiveGCThreshold;
static uint32_t hardGCThreshold;
static uint32_t currentThreshold;
static uint32_t initialMemorySize;
static uint32_t initialStackPointer;

static bool GetPropFunc(JSContext* cx, unsigned argc, JS::Value* vp, uint32_t value) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  args.rval().setInt32(value);
  return true;
}

size_t realHeapBytes(JSContext* cx);

static bool GetMemTotalFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, getMemorySize());
}

static bool GetMemLimitFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, memoryLimit);
}

static bool GetMemHeapReservedFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, getMemorySize() - initialMemorySize);
}

static bool GetMemHeapUsedFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, realHeapBytes(cx));
}

static bool GetMemHeapThresholdFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, currentThreshold);
}

static bool GetMemHeapMinThresholdFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, aggressiveGCThreshold);
}

static bool GetMemHeapLimitFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, hardGCThreshold);
}

static bool GetMemStackSizeFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    uint32_t spBase = (initialStackPointer + 65535) & 0xFFFF0000;
    return GetPropFunc(cx, argc, vp, spBase - getStackPointer());
}

static bool GetMemStackLimitFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    uint32_t spBase = (initialStackPointer + 65535) & 0xFFFF0000;
    return GetPropFunc(cx, argc, vp, spBase);
}

static bool calculateStackUsage(JSContext* cx, unsigned argc, JS::Value* vp) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    uint64_t *ptr = (uint64_t *)0;
    while (*ptr == 0) {
        ptr++;
    }
    uint32_t zeroedStackSize = (uintptr_t)ptr;
    uint32_t spBase = (initialStackPointer + 65535) & 0xFFFF0000;
    args.rval().setInt32(spBase - zeroedStackSize);
    return true;
}

static JSFunctionSpec sandboxMemoryFunctions[] = {
    JS_FN("calculateStackUsage", calculateStackUsage, 0, 0),
    JS_FS_END};


static JSPropertySpec sandboxMemoryProperties[] = {
    JS_PSG("total", GetMemTotalFunc, JSPROP_ENUMERATE),
    JS_PSG("limit", GetMemLimitFunc, JSPROP_ENUMERATE),
    JS_PSG("heapReserved", GetMemHeapReservedFunc, JSPROP_ENUMERATE),
    JS_PSG("heapUsed", GetMemHeapUsedFunc, JSPROP_ENUMERATE),
    JS_PSG("heapThreshold", GetMemHeapThresholdFunc, JSPROP_ENUMERATE),
    JS_PSG("heapMinThreshold", GetMemHeapMinThresholdFunc, JSPROP_ENUMERATE),
    JS_PSG("heapLimit", GetMemHeapLimitFunc, JSPROP_ENUMERATE),
    JS_PSG("stackSize", GetMemStackSizeFunc, JSPROP_ENUMERATE),
    JS_PSG("stackLimit", GetMemStackLimitFunc, JSPROP_ENUMERATE),
    JS_PS_END};


static bool defineSandboxObject()
{
    dx->sandboxObject.set(JS_NewObject(cx, nullptr));
    dx->sandboxValue.setObject(*dx->sandboxObject);
    dx->recvObject.set(JS_NewObject(cx, nullptr));
    dx->recvValue.setObject(*dx->recvObject);
    dx->memObject.set(JS_NewObject(cx, nullptr));
    dx->memValue.setObject(*dx->memObject);

    if (!JS_SetProperty(cx, dx->globalObject, "__sandbox__", dx->sandboxValue)) return false;
    if (!JS_SetProperty(cx, dx->sandboxObject, "recv", dx->recvValue)) return false;
    if (!JS_SetProperty(cx, dx->sandboxObject, "memory", dx->memValue)) return false;
    if (!JS_DefineFunctions(cx, dx->sandboxObject, sandboxSendFunctions)) return false;
    if (!JS_DefineFunctions(cx, dx->sandboxObject, sandboxGeneralFunctions)) return false;
    if (!JS_DefineFunctions(cx, dx->memObject, sandboxMemoryFunctions)) return false;
    if (!JS_DefineProperties(cx, dx->memObject, sandboxMemoryProperties)) return false;

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


#define HOW_AGGRESSIVE 128 /* 0 - 256 */

void checkAggressiveGC(uint32_t heapBytes)
{
    if (
        heapBytes > currentThreshold &&
        cx &&
        !JS::RuntimeHeapIsBusy() &&
        JS::CheckIfGCAllowedInCurrentState(JS_GetRuntime(cx))
    ) {
        /*log("BEFORE: bytes %d - %d, num %d, major %d, minor %d, slice %d\n",
            heapBytes,
            JS_GetGCParameter(cx, JSGC_BYTES),
            JS_GetGCParameter(cx, JSGC_NUMBER),
            JS_GetGCParameter(cx, JSGC_MAJOR_GC_NUMBER),
            JS_GetGCParameter(cx, JSGC_MINOR_GC_NUMBER),
            JS_GetGCParameter(cx, JSGC_SLICE_NUMBER));*/
        auto before = JS_GetGCParameter(cx, JSGC_NUMBER);
        NonIncrementalGC(cx, JS::GCOptions::Normal, JS::GCReason::TOO_MUCH_MALLOC);
        auto after = JS_GetGCParameter(cx, JSGC_NUMBER);
        if (after != before) {
            uint32_t heapSize = realHeapBytes(cx);
            auto old = currentThreshold;
            currentThreshold = std::max(
                aggressiveGCThreshold,
                (uint32_t)(((uint64_t)(256 + HOW_AGGRESSIVE) * (uint64_t)heapSize
                + (uint64_t)(256 - HOW_AGGRESSIVE) * (uint64_t)hardGCThreshold) / (uint64_t)512));
            currentThreshold = std::max(currentThreshold, heapSize + MIN_THRESHOLD_INCREMENT);
            log("heap %d KB -> %d KB, threshold %d KB -> %d KB", heapBytes / 1024, heapSize / 1024, old / 1024, currentThreshold / 1024);
        }
        /*log("AFTER: bytes %d - %d, num %d, major %d, minor %d, slice %d\n",
            heapBytes,
            JS_GetGCParameter(cx, JSGC_BYTES),
            JS_GetGCParameter(cx, JSGC_NUMBER),
            JS_GetGCParameter(cx, JSGC_MAJOR_GC_NUMBER),
            JS_GetGCParameter(cx, JSGC_MINOR_GC_NUMBER),
            JS_GetGCParameter(cx, JSGC_SLICE_NUMBER));*/
    }
}

void checkAggressiveGC2(uint32_t heapBytes)
{
    //checkAggressiveGC(heapBytes);
}

WASM_EXPORT(init)
bool init(uint32_t aggressiveGCThreshold, uint32_t hardGCThreshold, uint32_t memoryLimit, SandboxFlags::T flags)
{
    ::aggressiveGCThreshold = aggressiveGCThreshold;
    ::hardGCThreshold = hardGCThreshold;
    ::memoryLimit = memoryLimit;
    currentThreshold = aggressiveGCThreshold;
    sandboxFlags = flags;

    cx = JS_NewContext(aggressiveGCThreshold);
    if (!cx) {
        return false;
    }

    JS_malloc(cx, 10000);

    if (!JS::InitSelfHostedCode(cx)) {
        return false;
    }

    JS_SetGCParameter(cx, JSGC_INCREMENTAL_GC_ENABLED, flags & SandboxFlags::IncrementalGC ? 1 : 0);
    JS_SetGCParameter(cx, JSGC_BALANCED_HEAP_LIMITS_ENABLED, 0);
    JS_SetGCParameter(cx, JSGC_PER_ZONE_GC_ENABLED, 0);

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
    *       * aggressiveGCThreshold - heap size when aggressive GC kicks in
    *       * hardThreshold - heap size when GC works all the time
    *   return max(aggressiveGCThreshold, (0.5 + k / 2) * heapSize + (0.5 - k / 2) * hardThreshold)
    *   where k is parameter from 0 to 1 tells how aggressive approach is used
    *   when we are are close to the limit.
    *       0.0 - almost not aggressive
    *       0.5 - pretty optimal value
    *       0.8 - very aggressive
    * 
    * Useful symbols:
    *      NonIncrementalGC
    *      CellAllocator::PreAllocChecks
    *      JSContext::suppressGC
    *      JSContext::isInUnsafeRegion
    *      conditions for GC:
    *          !JS::RuntimeHeapIsBusy()
    *          !JSContext::suppressGC
    *          !JSContext::isInUnsafeRegion()
    *          !JSRuntime::isBeingDestroyed()
    *          !GCRuntime::isShutdownGC()
    *      checkIfGCAllowedInCurrentState
    */
    //JS_SetGCParameter(cx, JSGC_MAX_BYTES, heapSizeLimit);
    //JS_SetGCParameter(cx, JSGC_ALLOCATION_THRESHOLD, 32);
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
    initialMemorySize = getMemorySize();
    initialStackPointer = getStackPointer();
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
