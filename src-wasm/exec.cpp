
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

#include "sandbox-api.h"
#include "sandbox.h"
#include "exec.h"


static uintptr_t minHeapPtr = (uintptr_t)(-1);


WASM_EXPORT(malloc)
void* engineMalloc(uint32_t size)
{
    // TODO: Maybe move it to exec.cpp
    void* result = JS_malloc(cx, size);
    if (result && (uintptr_t)result < minHeapPtr) {
        minHeapPtr = (uintptr_t)result;
    }
    return result;
}


WASM_EXPORT(realloc)
void* engineRealloc(void* ptr, uint32_t oldSize, uint32_t newSize)
{
    return JS_realloc(cx, ptr, oldSize, newSize);
}


WASM_EXPORT(free)
void engineFree(void* ptr)
{
    if ((uintptr_t)ptr < minHeapPtr) return;
    JS_free(cx, ptr);
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

template<typename T>
void objectDelete(T* obj) {
    if ((uintptr_t)obj < minHeapPtr) return;
    obj->~T();
    engineFree(static_cast<void*>(obj));
}


WASM_EXPORT(create)
SandboxObject* objectCreate(uint32_t type, uint32_t additionalSize)
{
    switch (type)
    {
        case SandboxString::Id:
            return objectNewWithBuffer<SandboxString>(additionalSize);
        case ExceptionResult::Id:
            return objectNewWithBuffer<ExceptionResult>(additionalSize);
        default:
            logError("Invalid object type %d.", type);
            return nullptr;
    }
}

WASM_EXPORT(dispose)
void objectDispose(SandboxObject* object)
{
    if (!object) return;
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

static char* valueToString(JS::HandleValue value, uint32_t headSize, uint32_t &stringSize)
{
    // Convert to string
    JS::RootedString str(cx, value.toString());
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
        engineFree(buffer);
        logError("Cannot convert string to UTF-8.");
        return nullptr;
    }
    auto read = std::get<0>(*stat);
    auto written = std::get<1>(*stat);

    // Check if string fits into buffer
    if (read != length) {
        // This should not happen since buffer is big enough
        engineFree(buffer);
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

static char* stringifyCurrentStack(uint32_t headSize, uint32_t &stringSize)
{
    JS::RootedObject stack(cx);
    if (!JS::CaptureCurrentStack(cx, &stack) || !stack) {
        return nullptr;
    }

    JS::RootedValue stackVal(cx, JS::ObjectValue(*stack));

    return valueToString(stackVal, headSize, stringSize);
}

static ExceptionResult* throwEngineError(const char* message)
{
    ExceptionResult* result;
    uint32_t headSize = sizeof(ExceptionResult);
    uint32_t stringSize = 0;
    char* ptr = stringifyCurrentStack(headSize, stringSize);
    if (!ptr) {
        // Fallback to error without stack trace
        logWarning("Cannot get current stack.");
        result = objectNew<ExceptionResult>();
        if (!result) {
            // Fallback to static result
            static ExceptionResult fallbackResult;
            fallbackResult.name.setConst("EngineError");
            fallbackResult.message.setConst("Unknown error");
            fallbackResult.stack.setConst(nullptr);
            JS_ClearPendingException(cx);
            return &fallbackResult;
        }
        result->type = ErrorType::EngineError;
        result->name.setConst("EngineError");
        result->message.setConst(message);
        result->stack.setConst(nullptr);
        JS_ClearPendingException(cx);
        return result;
    }
    result = new (ptr) ExceptionResult();
    result->type = ErrorType::EngineError;
    result->name.setConst("EngineError");
    result->message.setConst(message);
    result->stack.setConst((char*)result + headSize, stringSize);
    JS_ClearPendingException(cx);
    return result;
}


WASM_EXPORT(compile)
SandboxObject* compile(SandboxString* source, SandboxString* fileName, ExecuteFlags::T flags)
{
    // Prepare options
    JSAutoRealm ar(cx, dx->globalObject); // TODO: Is is needed here?
    JS::CompileOptions options(cx);
    options
        .setNoScriptRval(!(flags & ExecuteFlags::ReturnValue))
        .setIsRunOnce(!!(flags & ExecuteFlags::Once));
    if (fileName) {
        char* name = (char*)engineMalloc(fileName->size + 1);
        if (name) {
            memcpy(name, fileName->data, fileName->size);
            name[fileName->size] = 0;
            options.setFileAndLine(name, 1);
            engineFree(name);
        }
        objectDelete(fileName);
    }
    if (flags & ExecuteFlags::Module) {
        options.setModule();
    }

    // Prepare source code text buffer
    JS::SourceText<mozilla::Utf8Unit> sourceText;
    if (!sourceText.init(cx, source->data, source->size, JS::SourceOwnership::Borrowed)) {
        objectDelete(source);
        return throwEngineError("Cannot initialize source code.");
    }

    // Allocate memory for the result
    auto result = objectNew<CompileResult>(flags);
    if (!result) {
        objectDelete(source);
        return throwEngineError("Cannot allocate memory for compiled code.");
    }

    // Compile the source code
    result->script.set(JS::Compile(cx, options, sourceText));

    // Source code is not needed anymore
    objectDelete(source);

    // Check for errors
    if (!result->script) {
        objectDelete(result);
        //TODO: return throwPendingError();
        return throwEngineError("Cannot compile source code.");
    }

    // Update allowed code pointers and return the result
    return result;
}


static ExceptionResult* stringFromHostToValue(SandboxString* input, JS::MutableHandleValue value, bool deleteInput)
{
    // Null goes to undefined
    if (input == nullptr || input->data == nullptr) {
        if (deleteInput && input) {
            objectDelete(input);
        }
        value.setUndefined();
        return nullptr;
    }

    // Convert to string
    JSString* str = JS_NewStringCopyUTF8N(cx, JS::UTF8Chars(input->data, input->size));
    if (deleteInput) {
        objectDelete(input);
    }
    if (!str) {
        return throwEngineError("Cannot create string from input data.");
    }

    // Check filter function
    bool filterFound;
    if (!JS_HasProperty(cx, dx->sandboxObject, "_onDataFromHost", &filterFound)) {
        // TODO: return throwPendingError();
        return throwEngineError("Cannot check filter function.");
    }

    if (filterFound) {
        // Pass argument to the filter function and return it
        JS::RootedValueArray<1> filterArgs(cx);
        filterArgs[0].setString(str);
        if (!JS_CallFunctionName(cx, dx->sandboxObject, "_onDataFromHost", filterArgs, value)) {
            // TODO: return throwPendingError();
            return throwEngineError("Cannot call filter function.");
        }
    } else {
        // Return string directly
        value.setString(str);
    }

    // Return no error
    return nullptr;
}


WASM_EXPORT(execute)
SandboxObject* execute(CompileResult* code, SandboxString* arg)
{
    JSAutoRealm ar(cx, dx->globalObject);

    // Get argument from static data
    JS::RootedValue argValue(cx);
    ExceptionResult* exception = stringFromHostToValue(arg, &argValue, true);
    if (exception) {
        return exception;
    }

    // Put argument to the sandbox object
    if (!JS_SetProperty(cx, dx->sandboxObject, "arg", argValue)) {
        // TODO: return throwPendingError();
        return throwEngineError("Cannot set __sandbox__.arg property.");
    }

    SandboxString* result;

    // Execute and return result
    if (code->flags & ExecuteFlags::ReturnValue) {
        JS::RootedValue rval(cx);
        if (!JS_ExecuteScript(cx, code->script, &rval)) {
            // TODO: return throwPendingError();
            return throwEngineError("Execution error.");
        }
        result = SandboxString::from(rval);
        if (!result) {
            return throwEngineError("Cannot allocate memory for result.");
        }
    } else {
        if (!JS_ExecuteScript(cx, code->script)) {
            // TODO: return throwPendingError();
            return throwEngineError("Execution error.");
        }
        result = objectNew<SandboxString>();
        if (!result) {
            return throwEngineError("Cannot allocate memory for result.");
        }
        result->setConst(nullptr);
    }

    return result;
}


WASM_EXPORT(call)
SandboxObject* call(uint32_t groupId, uint32_t functionId, SandboxString* arg)
{
    JSAutoRealm ar(cx, dx->globalObject);

    // Get argument from static data
    JS::RootedValue argValue(cx);
    ExceptionResult* exception = stringFromHostToValue(arg, &argValue, true);
    if (exception) {
        return exception;
    }

    JS::RootedValueArray<3> args(cx);
    args[0].setNumber(groupId);
    args[1].setNumber(functionId);
    args[2].set(argValue);
    JS::RootedValue rval(cx);
    if (!JS_CallFunctionName(cx, dx->sandboxObject, "_call", args, &rval)) {
        // TODO: return throwPendingError();
        return throwEngineError("Execution error.");
    }

    SandboxString* result = SandboxString::from(rval);
    if (!result) {
        return throwEngineError("Cannot allocate memory for result.");
    }

    return result;
}

SandboxString::SandboxString() :
    SandboxObject(Id),
    owned(0),
    size(0),
    data(nullptr)
{}

SandboxString::~SandboxString()
{
    if (owned) {
        engineFree(data);
    }
}

void SandboxString::clear()
{
    if (owned) {
        engineFree(data);
    }
    data = nullptr;
    size = 0;
    owned = 0;
}

void SandboxString::setConst(const char* str)
{
    clear();
    data = (char*)str;
    size = str ? strlen(str) : 0;
    owned = 0;
}

void SandboxString::setConst(const char* str, uint32_t size)
{
    clear();
    data = (char*)str;
    size = str ? size : 0;
    owned = 0;
}

SandboxString* SandboxString::from(JS::HandleValue value)
{
    uint32_t size;
    uint32_t headSize = sizeof(SandboxString);
    char* ptr = valueToString(value, headSize, size);
    if (!ptr) {
        return nullptr;
    }
    SandboxString* result = new (ptr) SandboxString();
    result->owned = 0;
    result->size = size;
    result->data = ptr + headSize;
    return result;
}

CompileResult::CompileResult(ExecuteFlags::T flags) :
    SandboxObject(Id),
    flags(flags),
    script(cx)
{}


//#error OK
