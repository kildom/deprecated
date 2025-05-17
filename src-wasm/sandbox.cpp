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
#include <jsfriendapi.h>
#include <jspubtd.h>
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


static const uint32_t MIN_THRESHOLD_INCREMENT = 256 * 1024;
static const uint32_t HEAP_SHRINK_THRESHOLD = 8 * 1024;
static const uint32_t GC_GREEDY_COEFFICIENT = 128; /* Range: -256 (to limit) .. 256 (to current) */
static LogLevel::T logLevel = LogLevel::None;

JSContext* cx = nullptr;
DynamicContext* dx = nullptr;

static uint32_t memoryLimit = 0;
uint32_t heapUsedPeak = 0;
static uint32_t heapUsedLimit = 0;
static uint32_t gcThreshold = 0;
static uint32_t gcThresholdMin = 0;
static uint32_t gcThresholdPeak = 0;
static uint32_t initialMemorySize = 0;
static uint32_t initialStackPointer = 0;

namespace js {
    namespace gc {
        extern uint32_t trackedZoneBytes;
    }
}

static bool defineSandboxObject();
static inline uint32_t getHeapUsed() { return js::gc::trackedZoneBytes; }


#pragma endregion


#pragma region ------------------ DEBUG LOGGING ------------------


void _logStatic(LogLevel::T level, const char* text)
{
    if (level > logLevel) {
        return;
    }
    hostLog(level, text, strlen(text));
}

void _logFormat(LogLevel::T level, const char* format, ...)
{
    if (level > logLevel) {
        return;
    }
    static char logBuffer[4 * 1024];
    int size;
    std::va_list args;
    va_start(args, format);
    size = vsnprintf(logBuffer, sizeof(logBuffer), format, args);
    va_end(args);
    if (size < 0) {
        _logStatic(level, "Error formatting following log message:");
        _logStatic(level, format);
        return;
    }
    if (size >= sizeof(logBuffer)) {
        size = sizeof(logBuffer) - 1;
        logBuffer[size - 0] = 0;
        logBuffer[size - 1] = '.';
        logBuffer[size - 2] = '.';
        logBuffer[size - 3] = '.';
    }
    hostLog(level, logBuffer, size);
}


#pragma endregion


#pragma region ------------------ INITIALIZATION AND SANDBOX MANAGEMENT ------------------


void updateThreshold()
{
    auto heapUsed = getHeapUsed();
    gcThreshold = std::max(
        gcThresholdMin,
        (uint32_t)(((uint64_t)(256 + GC_GREEDY_COEFFICIENT) * (uint64_t)heapUsed
        + (uint64_t)(256 - GC_GREEDY_COEFFICIENT) * (uint64_t)heapUsedLimit) / (uint64_t)512));
    gcThreshold = std::max(gcThreshold, heapUsed + MIN_THRESHOLD_INCREMENT);
}


uint32_t checkGreedyGC()
{
    auto heapBefore = getHeapUsed();
    auto oldThreshold = gcThreshold;

    // Check if we need a GC now
    if (heapBefore <= gcThreshold ||
        JS::RuntimeHeapIsBusy() ||
        !JS::CheckIfGCAllowedInCurrentState(JS_GetRuntime(cx))
    ) {
        return gcThreshold;
    }

    // Do garbage collection
    auto numberBefore = JS_GetGCParameter(cx, JSGC_NUMBER);
    JS::PrepareForFullGC(cx);
    JS::NonIncrementalGC(cx, JS::GCOptions::Normal, JS::GCReason::TOO_MUCH_MALLOC);
    auto numberAfter = JS_GetGCParameter(cx, JSGC_NUMBER);
    auto heapAfter = getHeapUsed();

    // Check if GC happened
    if (numberAfter == numberBefore) {
        return gcThreshold;
    }

    // Rerun GC with shrink option set if heap did not shrink enough
    uint32_t heapBeforeShrink = 0;
    if (heapAfter + HEAP_SHRINK_THRESHOLD > heapBefore) {
        heapBeforeShrink = heapAfter;
        JS::PrepareForFullGC(cx);
        JS::NonIncrementalGC(cx, JS::GCOptions::Shrink, JS::GCReason::TOO_MUCH_MALLOC);
        heapAfter = getHeapUsed();
    }

    // Calculate new threshold
    updateThreshold();
    
    // Keep peak value of the threshold
    if (gcThreshold > gcThresholdPeak) {
        gcThresholdPeak = gcThreshold;
    }

    // Log the message
    if (heapBeforeShrink > 0) {
        logInfo("GC by threshold with shrink: %d KB -> %d KB -> %d KB = %d KB, threshold %d KB -> %d KB",
            heapBefore / 1024, heapBeforeShrink / 1024, heapAfter / 1024, (int)(heapBefore - heapAfter) / 1024,
            oldThreshold / 1024, gcThreshold / 1024);
    } else {
        logInfo("GC by threshold: %d KB -> %d KB = %d KB, threshold %d KB -> %d KB",
            heapBefore / 1024, heapAfter / 1024, (int)(heapBefore - heapAfter) / 1024,
            oldThreshold / 1024, gcThreshold / 1024);
    }

    return gcThreshold;
}

static void onGC(JSContext* cx, JSGCStatus status, JS::GCReason reason, void* data)
{
    auto heapUsed = getHeapUsed();
    static uint32_t heapBefore;

    if (heapUsed > heapUsedPeak) {
        heapUsedPeak = heapUsed;
    }

    if (status == JSGC_BEGIN) {
        heapBefore = heapUsed;
        logInfo("GC begin: %d KB, %d.%d, %s",
            heapUsed / 1024,
            (int)JS_GetGCParameter(cx, JSGC_MAJOR_GC_NUMBER), (int)JS_GetGCParameter(cx, JSGC_MINOR_GC_NUMBER),
            ExplainGCReason(reason));
    } else if (status == JSGC_END) {
        auto oldThreshold = gcThreshold;
        updateThreshold();
        logInfo("GC end: %d KB -> %d KB = %d KB, threshold %d KB -> %d KB",
            heapBefore / 1024, heapUsed / 1024, (int)(heapBefore - heapUsed) / 1024,
            oldThreshold / 1024, gcThreshold / 1024);
    }
}

WASM_EXPORT(init)
bool init(uint32_t gcThresholdMin, uint32_t heapUsedLimit, uint32_t memoryLimit, LogLevel::T logLevel)
{
    static JSClass SandboxGlobalClass = { "SandboxGlobal", JSCLASS_GLOBAL_FLAGS, &JS::DefaultGlobalClassOps };

    ::gcThresholdMin = gcThresholdMin;
    ::heapUsedLimit = heapUsedLimit;
    ::memoryLimit = memoryLimit;
    ::logLevel = logLevel;
    gcThreshold = gcThresholdMin;

    cx = JS_NewContext(std::max(gcThresholdMin, memoryLimit));
    if (!cx) {
        return false;
    }

    JS_SetGCParameter(cx, JSGC_INCREMENTAL_GC_ENABLED, 1);
    JS_SetGCParameter(cx, JSGC_BALANCED_HEAP_LIMITS_ENABLED, 0);
    JS_SetGCParameter(cx, JSGC_PER_ZONE_GC_ENABLED, 0);

    if (!JS::InitSelfHostedCode(cx)) {
        return false;
    }

    JS_SetGCCallback(cx, onGC, nullptr);
    JS_SetGCParametersBasedOnAvailableMemory(cx, heapUsedLimit);

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



#pragma region ------------------ SANDBOX OBJECTS ------------------


static bool GetPropFunc(JSContext* cx, unsigned argc, JS::Value* vp, uint32_t value) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  args.rval().setInt32(value);
  return true;
}

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
    return GetPropFunc(cx, argc, vp, getHeapUsed());
}

static bool GetMemHeapUsedPeakFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, heapUsedPeak);
}

static bool GetMemGcThresholdFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, gcThreshold);
}

static bool GetMemGcThresholdMinFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, gcThresholdMin);
}

static bool GetMemGcThresholdPeakFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, gcThresholdPeak);
}

static bool GetMemHeapUsedLimitFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    return GetPropFunc(cx, argc, vp, heapUsedLimit);
}

static bool GetMemStackUsedFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
    uint32_t spBase = (initialStackPointer + 65535) & 0xFFFF0000;
    return GetPropFunc(cx, argc, vp, spBase - getStackPointer());
}

static bool GetMemStackUsedLimitFunc(JSContext* cx, unsigned argc, JS::Value* vp) {
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

static bool doGarbageCollection(JSContext* cx, unsigned argc, JS::Value* vp) {
    auto before = getHeapUsed();
    JS::PrepareForFullGC(cx);
    JS::NonIncrementalGC(cx, JS::GCOptions::Shrink, JS::GCReason::API);
    auto after = getHeapUsed();
    logInfo("GC by guest: %d KB -> %d KB = %d KB", before / 1024, after / 1024, (int)(before - after) / 1024);
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
    JS_PSG("heapUsedPeak", GetMemHeapUsedPeakFunc, JSPROP_ENUMERATE),
    JS_PSG("heapUsedLimit", GetMemHeapUsedLimitFunc, JSPROP_ENUMERATE),
    JS_PSG("gcThreshold", GetMemGcThresholdFunc, JSPROP_ENUMERATE),
    JS_PSG("gcThresholdMin", GetMemGcThresholdMinFunc, JSPROP_ENUMERATE),
    JS_PSG("gcThresholdPeak", GetMemGcThresholdPeakFunc, JSPROP_ENUMERATE),
    JS_PSG("stackUsed", GetMemStackUsedFunc, JSPROP_ENUMERATE),
    JS_PSG("stackUsedLimit", GetMemStackUsedLimitFunc, JSPROP_ENUMERATE),
    JS_PS_END};

JSFunctionSpec sandboxGeneralFunctions[] = {
    JS_FN("call", callJs, 3, 0),
    JS_FS_END};

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
