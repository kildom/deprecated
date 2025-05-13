/*
 * Copyright 2025 Dominik Kilian
 *
 * Redistribution and use in source and binary forms,  with or without modification, are permitted provided
 * that the following conditions are met:
 * 1. Redistributions  of source code must retain  the above copyright notice,  this list of conditions and
 *    the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 *    the following disclaimer in the documentation  and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED  BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING,  BUT NOT LIMITED TO,  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT,  INDIRECT,  INCIDENTAL,  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL DAMAGES (INCLUDING,  BUT NOT
 * LIMITED TO,  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;  LOSS OF USE,  DATA,  OR PROFITS;  OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,  WHETHER IN CONTRACT,  STRICT LIABILITY, OR
 * TORT  (INCLUDING NEGLIGENCE OR OTHERWISE)  ARISING IN ANY WAY OUT  OF THE USE OF THIS SOFTWARE,  EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


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
#include "api.h"
#include "sandbox.h"


#pragma region ------------------ GLOBAL VARIABLES ------------------


static const uint32_t MIN_THRESHOLD_INCREMENT = 8 * 1024;
static const uint32_t GC_AGGRESSIVE_COEFFICIENT = 128; /* Range: 0 - 256 */
static LogLevel::T logLevel = LogLevel::None;

JSContext* cx;
DynamicContext* dx;

#pragma endregion


#pragma region ------------------ SANDBOX OBJECTS ------------------


static bool doGarbageCollection(JSContext* cx, unsigned argc, JS::Value* vp) {
    NonIncrementalGC(cx, JS::GCOptions::Normal, JS::GCReason::API);
    return true;
}

JSFunctionSpec sandboxGeneralFunctions[] = {
    JS_FN("call", callJs, 3, 0),
    JS_FS_END};

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
    JS_FN("gc", doGarbageCollection, 0, 0),
    JS_FS_END};


static JSPropertySpec sandboxMemoryProperties[] = {
    JS_PSG("total", GetMemTotalFunc, JSPROP_ENUMERATE),
    JS_PSG("limit", GetMemLimitFunc, JSPROP_ENUMERATE),
    JS_PSG("heapReserved", GetMemHeapReservedFunc, JSPROP_ENUMERATE),
    JS_PSG("heapUsed", GetMemHeapUsedFunc, JSPROP_ENUMERATE),
    JS_PSG("heapThreshold", GetMemHeapThresholdFunc, JSPROP_ENUMERATE),
    JS_PSG("heapMinThreshold", GetMemHeapMinThresholdFunc, JSPROP_ENUMERATE),
    // TODO: Report fatal error if aggressive GC is executed multiple times and heap is still above the limit.
    // This will prevent from very slow execution which can affect the host.
    JS_PSG("heapLimit", GetMemHeapLimitFunc, JSPROP_ENUMERATE),
    JS_PSG("stackSize", GetMemStackSizeFunc, JSPROP_ENUMERATE),
    JS_PSG("stackLimit", GetMemStackLimitFunc, JSPROP_ENUMERATE),
    JS_PS_END};


static bool defineSandboxObject()
{
    dx->sandboxObject.set(JS_NewObject(cx, nullptr));
    dx->sandboxValue.setObject(*dx->sandboxObject);
    dx->memObject.set(JS_NewObject(cx, nullptr));
    dx->memValue.setObject(*dx->memObject);

    if (!JS_SetProperty(cx, dx->globalObject, "__sandbox__", dx->sandboxValue)) return false;
    if (!JS_SetProperty(cx, dx->sandboxObject, "memory", dx->memValue)) return false;
    if (!JS_DefineFunctions(cx, dx->sandboxObject, sandboxGeneralFunctions)) return false;
    if (!JS_DefineFunctions(cx, dx->memObject, sandboxMemoryFunctions)) return false;
    if (!JS_DefineProperties(cx, dx->memObject, sandboxMemoryProperties)) return false;

    return true;
}

#pragma endregion

#pragma region ------------------ DEBUG LOGGING ------------------


void _log(LogLevel::T level, const char* format, ...)
{
    if (level > logLevel) {
        return;
    }
    int size = 1024;
    if (0) { // TODO: Fix this
        static char tmp[1];
        std::va_list args;
        size = vsnprintf(tmp, 1, format, args) + 1024;
        va_end(args);
    }
    {
        char *ptr = (char*)malloc(size + 1);
        if (!ptr) {
            hostLog(level, "malloc failed!", 14);
            return;
        }
        std::va_list args;
        va_start(args, format);
        size = vsnprintf(ptr, size + 1, format, args);
        va_end(args);
        hostLog(level, ptr, size);
        free(ptr);
    }
}


#pragma endregion


#pragma region ------------------ INITIALIZATION AND SANDBOX MANAGEMENT ------------------



void checkAggressiveGC(uint32_t heapBytes)
{
    // TODO: Check if engineMalloc is also included in the heapBytes
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
                (uint32_t)(((uint64_t)(256 + GC_AGGRESSIVE_COEFFICIENT) * (uint64_t)heapSize
                + (uint64_t)(256 - GC_AGGRESSIVE_COEFFICIENT) * (uint64_t)hardGCThreshold) / (uint64_t)512));
            currentThreshold = std::max(currentThreshold, heapSize + MIN_THRESHOLD_INCREMENT);
            logInfo("heap %d KB -> %d KB, threshold %d KB -> %d KB", heapBytes / 1024, heapSize / 1024, old / 1024, currentThreshold / 1024);
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


WASM_EXPORT(init)
bool init(uint32_t aggressiveGCThreshold, uint32_t hardGCThreshold, uint32_t memoryLimit, LogLevel::T logLevel)
{
    static JSClass SandboxGlobalClass = { "SandboxGlobal", JSCLASS_GLOBAL_FLAGS, &JS::DefaultGlobalClassOps };

    ::aggressiveGCThreshold = aggressiveGCThreshold;
    ::hardGCThreshold = hardGCThreshold;
    ::memoryLimit = memoryLimit;
    ::logLevel = logLevel;
    currentThreshold = aggressiveGCThreshold;

    cx = JS_NewContext(std::max(aggressiveGCThreshold, hardGCThreshold / 4 * 3));
    if (!cx) {
        return false;
    }

    JS_malloc(cx, 10000);

    if (!JS::InitSelfHostedCode(cx)) {
        return false;
    }

    JS_SetGCParameter(cx, JSGC_INCREMENTAL_GC_ENABLED, 1);
    JS_SetGCParameter(cx, JSGC_BALANCED_HEAP_LIMITS_ENABLED, 0);
    JS_SetGCParameter(cx, JSGC_PER_ZONE_GC_ENABLED, 0);

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


int main(int argc, const char* argv[]) {
    initialMemorySize = getMemorySize();
    initialStackPointer = getStackPointer();
    if (!JS_Init()) {
        return 1;
    }
    return hostEntry();
}


#pragma endregion
