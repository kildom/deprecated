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
#include <assert.h>
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

#include "api-types.h"
#include "api.h"
#include "sandbox.h"


namespace js {
    namespace gc {
        extern uint32_t trackedZoneBytes;
    }
}

/**
 * Helper structure to create a string object from static data.
 * 
 * Memory layout must be fully compatible with the `SandboxString` structure.
 */
template <int N>
struct SandboxStringConst
{
    uint8_t type;
    uint8_t isStatic;
    uint16_t _reserved16;
    uint32_t size;
    char data[N];
};


template<std::size_t N>
constexpr std::size_t _cstrSizeConst(const char (&str)[N])
{
    return N;
}

#define SANDBOX_STRING_CONST(str) \
struct \
{ \
    operator SandboxString*() \
    { \
        static SandboxStringConst<_cstrSizeConst(str)> value = { \
            .type = SandboxString::Id, \
            .isStatic = 1, \
            .size = _cstrSizeConst(str) - 1, \
            .data = str, \
        }; \
        return (SandboxString*)&value; \
    } \
}

struct ExceptionResultConst
{
    uint8_t type;
    uint8_t isStatic;
    ErrorType::T errorType;
    uint8_t _reserved8;
    SandboxString* name;
    SandboxString* message;
    SandboxString* stack;
};

static_assert(sizeof(SandboxAny) == 2, "SandboxAny");
static_assert(sizeof(SandboxString) == 8, "SandboxString");
static_assert(sizeof(SandboxStringConst<4>) == 12, "SandboxStringConst");
static_assert(sizeof(ExceptionResult) == 16, "ExceptionResult");
static_assert(sizeof(ExceptionResultConst) == 16, "ExceptionResultConst");
static_assert(sizeof(CompileResult) > 4, "CompileResult");

void* engineMalloc(uint32_t size)
{
    void* ptr = malloc(size);
    if (ptr) {
        js::gc::trackedZoneBytes += size;
        if (js::gc::trackedZoneBytes > heapUsedPeak) {
            heapUsedPeak = js::gc::trackedZoneBytes;
            logInfo("heapUsedPeak: %d", heapUsedPeak);
        }
    }
    return ptr;
}

void* engineRealloc(void* ptr, uint32_t oldSize, uint32_t newSize)
{
    ptr = realloc(ptr, newSize);
    if (ptr) {
        js::gc::trackedZoneBytes += newSize - oldSize;
        if (js::gc::trackedZoneBytes > heapUsedPeak) {
            heapUsedPeak = js::gc::trackedZoneBytes;
            logInfo("heapUsedPeak: %d", heapUsedPeak);
        }
    }
    return ptr;
}

void engineFree(void* ptr, uint32_t oldSize)
{
    if (ptr) {
        js::gc::trackedZoneBytes -= oldSize;
    }
    free(ptr);
}

template<typename T, typename... Args>
T* objectNew(Args&&... args) {
    void* memory = engineMalloc(sizeof(T));
    if (!memory) {
        return nullptr;
    }
    return new (memory) T(std::forward<Args>(args)...);
}

template<typename T, typename... Args>
T* objectNewWithBuffer(uint32_t bufferSize, Args&&... args) {
    void* memory = engineMalloc(sizeof(T) + bufferSize);
    if (!memory) {
        return nullptr;
    }
    return new (memory) T(std::forward<Args>(args)...);
}

void objectDelete(SandboxString* obj) {
    auto size = sizeof(SandboxString) + obj->size + 1;
    obj->~SandboxString();
    engineFree(static_cast<void*>(obj), size);
}

void objectDelete(ExceptionResult* obj) {
    obj->~ExceptionResult();
    engineFree(static_cast<void*>(obj), sizeof(ExceptionResult));
}

void objectDelete(CompileResult* obj) {
    obj->~CompileResult();
    engineFree(static_cast<void*>(obj), sizeof(ExceptionResult));
}

ExceptionResult::~ExceptionResult()
{
    if (name) objectDelete(name);
    if (message) objectDelete(message);
    if (stack) objectDelete(stack);
}


CompileResult::CompileResult(ExecuteFlags::T flags): SandboxAny(Id), flags(flags), script(cx)
{
}


WASM_EXPORT(create)
SandboxAny* objectCreate(uint32_t type, uint32_t size)
{
    switch (type)
    {
        case SandboxString::Id:
            return objectNewWithBuffer<SandboxString>(size + 1, size);
        case ExceptionResult::Id:
            if (size > 0) {
                logError("ExceptionResult type allows only size 0, provided %d.", size);
                return nullptr;
            }
            return objectNew<ExceptionResult>();
        default:
            logError("Invalid object type %d.", type);
            return nullptr;
    }
}


WASM_EXPORT(dispose)
void objectDispose(SandboxAny* object)
{
    if (!object || object->isStatic) return;
    switch (object->type)
    {
        case SandboxString::Id:
            objectDelete((SandboxString*)object);
            break;
        case ExceptionResult::Id:
            objectDelete((ExceptionResult*)object);
            break;
        case CompileResult::Id:
            objectDelete((CompileResult*)object);
            break;
        default:
            logError("Invalid object type %d.", object->type);
            break;
    }
}

/* UNUSED
WASM_EXPORT(resize)
SandboxAny* objectResize(SandboxAny* object, uint32_t size)
{
    if (object->type != SandboxString::Id) return nullptr;
    SandboxString* str = (SandboxString*)object;
    uint32_t oldSize = sizeof(SandboxString) + str->size + 1;
    uint32_t newSize = sizeof(SandboxString) + size + 1;
    SandboxString* newStr = (SandboxString*)engineRealloc(str, oldSize, newSize);
    if (!newStr) {
        return nullptr;
    }
    return newStr;
}
*/

static char* valueToString(JS::HandleValue value, uint32_t headSize, uint32_t &stringSize)
{
    // Convert to string
    JS::RootedString str(cx, JS::ToString(cx, value));
    if (!str) {
        return nullptr;
    }
    uint32_t length = JS_GetStringLength(str);
    bool latin1Only = JS::StringHasLatin1Chars(str);

    // Allocate maximum buffer size
    uint32_t size = latin1Only ? 2 * length : 3 * length;
    char* buffer = (char*)engineMalloc(headSize + size);
    if (!buffer) {
        return nullptr;
    }

    // Convert string to UTF-8
    auto stat = JS_EncodeStringToUTF8BufferPartial(cx, str, mozilla::Span(buffer + headSize, size));
    if (stat.isNothing()) {
        engineFree(buffer, headSize + size);
        logError("Cannot convert string to UTF-8.");
        return nullptr;
    }
    auto read = std::get<0>(*stat);
    auto written = std::get<1>(*stat);

    // Check if string fits into buffer
    if (read != length) {
        // This should not happen since buffer is big enough
        engineFree(buffer, headSize + size);
        logError("This should not happen: Buffer was to small.");
        return nullptr;
    }

    // Strip buffer to its actual size
    if (written < size) {
        char* newPtr = (char*)engineRealloc(buffer, headSize + size, headSize + written);
        if (newPtr) {
            buffer = newPtr;
        }
    }

    // Return the buffer
    stringSize = written;
    return buffer;
}


SandboxString* SandboxString::from(JS::HandleValue value)
{
    uint32_t size;
    uint32_t headSize = sizeof(SandboxString);
    char* ptr = valueToString(value, headSize, size);
    if (!ptr) {
        return nullptr;
    }
    return new (ptr) SandboxString(size);
}

static ExceptionResult* throwEngineError(SandboxString* message = nullptr)
{
    static SANDBOX_STRING_CONST("EngineError") engineErrorString;
    static SANDBOX_STRING_CONST("Unknown error.") unknownErrorString;
    ExceptionResult* result;
    uint32_t headSize = sizeof(ExceptionResult);
    uint32_t stringSize = 0;
    char* ptr = 0;//stringifyCurrentStack(headSize, stringSize);
    if (!ptr) {
        // Fallback to error without stack trace
        logWarning("Cannot get current stack.");
        result = objectNew<ExceptionResult>();
        if (!result) {
            // Fallback to static result
            static ExceptionResultConst fallbackException = {
                .type = ExceptionResult::Id,
                .isStatic = 1,
                .errorType = ErrorType::EngineError,
                .name = engineErrorString,
                .message = unknownErrorString,
                .stack = nullptr,
            };
            JS_ClearPendingException(cx);
            return (ExceptionResult*)(&fallbackException);
        }
        result->errorType = ErrorType::EngineError;
        result->name = engineErrorString;
        result->message = message ? message : unknownErrorString;
        JS_ClearPendingException(cx);
        return result;
    }
    #if 0
    result = new (ptr) ExceptionResult();
    result->type = ErrorType::EngineError;
    result->name = engineErrorString;
    result->message.setConst(message);
    result->stack.setConst((char*)result + headSize, stringSize);
    JS_ClearPendingException(cx);
    return result;
    #endif
    return nullptr;
}

static ExceptionResult* throwPendingError(SandboxString* fallbackMessage = nullptr)
{
    logInfo("Throwing pending error");
    JS::RootedValue exception(cx);
    if (!JS_GetPendingException(cx, &exception)) {
        if (fallbackMessage) {
            return throwEngineError(fallbackMessage);
        } else {
            logInfo("No pending error");
            return throwEngineError();
        }
    }
    JS_ClearPendingException(cx);

    JS::RootedValue name(cx);
    JS::RootedValue message(cx);
    JS::RootedValue stack(cx);

    if (exception.isObject()) {
        logInfo("Exception is object");
        JS::RootedObject obj(cx, &exception.toObject());
        JS_GetProperty(cx, obj, "name", &name);
        JS_ClearPendingException(cx);
        JS_GetProperty(cx, obj, "message", &message);
        JS_ClearPendingException(cx);
        JS_GetProperty(cx, obj, "stack", &stack); // TODO: Use fileName, lineNumber and columnNumber if stack is undefined or empty string
        JS_ClearPendingException(cx);
    } else {
        logInfo("Exception is not object");
        JS::RootedString str(cx, JS::ToString(cx, exception));
        if (!str) {
            return throwEngineError();
        }
        message.setString(str);
        JS_ClearPendingException(cx);
    }

    // Create result object
    ExceptionResult* result = objectNew<ExceptionResult>();
    if (!result) {
        static SANDBOX_STRING_CONST("Cannot allocate memory for error.") errorString;
        return throwEngineError(errorString);
    }
    result->errorType = ErrorType::GuestError;
    if (name.isUndefined()) {
        logInfo("Name is undefined");
        static SANDBOX_STRING_CONST("GuestError") guestErrorString;
        result->name = guestErrorString;
    } else {
        result->name = SandboxString::from(name);
        JS_ClearPendingException(cx);
        logInfo("Name is: %s", result->name->data());
    }
    if (message.isUndefined()) {
        logInfo("Message is undefined");
        static SANDBOX_STRING_CONST("Unknown guest error.") unkownGuestErrorString;
        result->message = unkownGuestErrorString;
    } else {
        result->message = SandboxString::from(message);
        JS_ClearPendingException(cx);
        logInfo("Message is: %s", result->message->data());
    }
    if (stack.isUndefined()) {
        // keep undefined
        logInfo("Stack is undefined");
    } else {
        result->stack = SandboxString::from(stack);
        JS_ClearPendingException(cx);
        logInfo("Stack is: %s", result->stack->data());
    }
    return result;
}

WASM_EXPORT(compile)
SandboxAny* compile(SandboxString* source, SandboxString* fileName, ExecuteFlags::T flags)
{
    // Prepare options
    JSAutoRealm ar(cx, dx->globalObject); // TODO: Is is needed here?
    JS::CompileOptions options(cx);
    options
        .setNoScriptRval(!(flags & ExecuteFlags::ReturnValue))
        .setIsRunOnce(!!(flags & ExecuteFlags::Once));
    if (fileName) {
        options.setFileAndLine(fileName->data(), 1);
    }
    if (flags & ExecuteFlags::Module) {
        options.setModule();
    }

    // Prepare source code text buffer
    JS::SourceText<mozilla::Utf8Unit> sourceText;
    if (!sourceText.init(cx, source->data(), source->size, JS::SourceOwnership::Borrowed)) {
        static SANDBOX_STRING_CONST("Cannot initialize source code.") errorString;
        return throwEngineError(errorString);
    }

    // Allocate memory for the result
    auto result = objectNew<CompileResult>(flags);
    if (!result) {
        static SANDBOX_STRING_CONST("Cannot allocate memory for compiled code.") errorString;
        return throwEngineError(errorString);
    }

    // Compile the source code
    auto x = JS::Compile(cx, options, sourceText);

    if (!x) {
        logInfo("Compilation failed");
        JS::RootedValue exception(cx);
        if (!JS_GetPendingException(cx, &exception)) {
            logInfo("No pending error");
        } else {
            logInfo("Pending error exists");
        }
    }

    result->script.set(x);

    // Check for errors
    if (!result->script) {
        objectDelete(result);
        return throwPendingError();
    }

    // Update allowed code pointers and return the result
    logInfo("Compiled code %d, type %d", (uintptr_t)result, *(char*)result);
    return result;
}

static SandboxAny* stringFromHostToValue(SandboxString* input, JS::MutableHandleValue value)
{
    // Null goes to undefined
    if (input == nullptr) {
        value.setUndefined();
        return nullptr;
    }

    // Convert to string
    JSString* str = JS_NewStringCopyUTF8N(cx, JS::UTF8Chars(input->data(), input->size));
    if (!str) {
        static SANDBOX_STRING_CONST("Cannot create string from input data.") errorString;
        return throwEngineError(errorString);
    }

    // Check filter function
    bool filterFound;
    if (!JS_HasProperty(cx, dx->sandboxObject, "_onDataFromHost", &filterFound)) {
        return throwPendingError();
    }

    if (filterFound) {
        // Pass argument to the filter function and return it
        JS::RootedValueArray<1> filterArgs(cx);
        filterArgs[0].setString(str);
        if (!JS_CallFunctionName(cx, dx->sandboxObject, "_onDataFromHost", filterArgs, value)) {
            return throwPendingError();
        }
    } else {
        // Return string directly
        value.setString(str);
    }

    // Return no error
    return nullptr;
}

static SandboxAny* convertToHostData(JS::MutableHandleValue value)
{
    static SANDBOX_STRING_CONST("Error running _onDataToHost filter function.") errorFallbackString;

    // Check filter function
    bool filterFound;
    if (!JS_HasProperty(cx, dx->sandboxObject, "_onDataToHost", &filterFound)) {
        return throwPendingError(errorFallbackString);
    }

    if (filterFound) {
        JS::RootedValueArray<1> filterArgs(cx);
        filterArgs[0].set(value);
        if (!JS_CallFunctionName(cx, dx->sandboxObject, "_onDataToHost", filterArgs, value)) {
            return throwPendingError(errorFallbackString);
        }
    }

    // Return no error
    return nullptr;
}

WASM_EXPORT(execute)
SandboxAny* execute(CompileResult* code, SandboxString* arg)
{
    JSAutoRealm ar(cx, dx->globalObject);

    // Get argument from static data
    JS::RootedValue argValue(cx);
    SandboxAny* exception = stringFromHostToValue(arg, &argValue);
    if (exception) {
        return exception;
    }

    // Put argument to the sandbox object
    if (!JS_SetProperty(cx, dx->sandboxObject, "arg", argValue)) {
        return throwPendingError();
    }

    static SANDBOX_STRING_CONST("Unknown error during execution.") execErrorString;

    SandboxString* result;

    // Execute and return result
    if (code->flags & ExecuteFlags::ReturnValue) {
        JS::RootedValue rval(cx);
        if (!JS_ExecuteScript(cx, code->script, &rval)) {
            return throwPendingError(execErrorString);
        }
        exception = convertToHostData(&rval);
        if (exception) {
            return exception;
        }
        result = SandboxString::from(rval);
        if (!result) {
            static SANDBOX_STRING_CONST("Cannot convert result to string.") errorString;
            return throwPendingError(errorString);
        }
    } else {
        if (!JS_ExecuteScript(cx, code->script)) {
            return throwPendingError(execErrorString);
        }
        result = nullptr;
    }

    return result;
}

WASM_EXPORT(call)
SandboxAny* call(uint32_t groupId, uint32_t functionId, SandboxString* arg)
{
    JSAutoRealm ar(cx, dx->globalObject);

    // Get argument from static data
    JS::RootedValue argValue(cx);
    SandboxAny* exception = stringFromHostToValue(arg, &argValue);
    if (exception) {
        return exception;
    }

    static SANDBOX_STRING_CONST("Unknown error during guest call.") execErrorString;

    JS::RootedValueArray<3> args(cx);
    args[0].setNumber(groupId);
    args[1].setNumber(functionId);
    args[2].set(argValue);
    JS::RootedValue rval(cx);
    if (!JS_CallFunctionName(cx, dx->sandboxObject, "_call", args, &rval)) {
        return throwPendingError(execErrorString);
    }

    exception = convertToHostData(&rval);
    if (exception) {
        return exception;
    }

    SandboxString* result = SandboxString::from(rval);
    if (!result) {
        static SANDBOX_STRING_CONST("Cannot convert result to string.") errorString;
        return throwPendingError(errorString);
    }

    return result;
}

static bool convertToHostDataBoolErr(JS::HandleValue input, JS::MutableHandleValue output)
{
    // Check filter function
    bool filterFound;
    if (!JS_HasProperty(cx, dx->sandboxObject, "_onDataToHost", &filterFound)) {
        return false;
    }

    if (filterFound) {
        JS::RootedValueArray<1> filterArgs(cx);
        filterArgs[0].set(input);
        if (!JS_CallFunctionName(cx, dx->sandboxObject, "_onDataToHost", filterArgs, output)) {
            return false;
        }
    } else {
        // Return string directly
        output.set(input);
    }

    return true;
}

static bool stringFromHostToValueBoolErr(SandboxString* input, JS::MutableHandleValue value)
{
    // Null goes to undefined
    if (input == nullptr) {
        value.setUndefined();
        return true;
    }

    // Convert to string
    JSString* str = JS_NewStringCopyUTF8N(cx, JS::UTF8Chars(input->data(), input->size));
    if (!str) {
        JS_ReportErrorUTF8(cx, "Failed to convert data from host to string.");
        return false;
    }

    // Check filter function
    bool filterFound;
    if (!JS_HasProperty(cx, dx->sandboxObject, "_onDataFromHost", &filterFound)) {
        return false;
    }

    if (filterFound) {
        // Pass argument to the filter function and return it
        JS::RootedValueArray<1> filterArgs(cx);
        filterArgs[0].setString(str);
        if (!JS_CallFunctionName(cx, dx->sandboxObject, "_onDataFromHost", filterArgs, value)) {
            return false;
        }
    } else {
        // Return string directly
        value.setString(str);
    }

    return true;
}

bool callJs(JSContext* cx, unsigned argc, JS::Value* vp)
{
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    if (!args.requireAtLeast(cx, "call", 3)) return false;
    double num0, num1;
    if (!JS::ToNumber(cx, args[0], &num0)) return false;
    if (!JS::ToNumber(cx, args[1], &num1)) return false;
    uint32_t groupId = (uint32_t)num0;
    uint32_t functionId = (uint32_t)num1;

    JS::RootedValue arg(cx);

    if (!convertToHostDataBoolErr(args[2], &arg)) {
        return false;
    }

    SandboxString* str = SandboxString::from(arg);
    if (!str) {
        JS_ReportErrorUTF8(cx, "Failed to pass data to host.");
        return false;
    }
    arg.setUndefined();

    SandboxAny* res = hostCall(groupId, functionId, str);

    objectDispose(str);

    if (!res) {
        args.rval().setUndefined();
    } else if (res->type == SandboxString::Id) {
        logInfo("Result is string");
        bool ok = stringFromHostToValueBoolErr((SandboxString*)res, &arg);
        objectDispose(res);
        if (!ok) {
            return false;
        }
        args.rval().set(arg);
        logInfo("Result converted to value");
    } else if (res->type == ExceptionResult::Id) {
        objectDispose(res);
        JS_ReportErrorUTF8(cx, "TODO: Exception from host.");
        return false;
    } else {
        objectDispose(res);
        JS_ReportErrorUTF8(cx, "Invalid data returned from host.");
        return false;
    }

    return true;
}
