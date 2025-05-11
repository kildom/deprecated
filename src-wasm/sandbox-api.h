#ifndef _SANDBOX_API_HH_
#define _SANDBOX_API_HH_

#include <stdint.h>

#include "wasm.h"

struct ExecuteFlags {
    enum T : uint16_t {
        // Execute the code as a script
        Script = 0,
        // Execute the code as a module
        Module = 1,
        // Return the result of the last statement
        ReturnValue = 2,
        // Execute the code only once
        Once = 4,
    };
    ExecuteFlags() = delete;
};


struct LogLevel {
    enum T : uint8_t {
        None = 0,
        Error = 1,
        Warning = 2,
        Info = 3,
    };
    LogLevel() = delete;
};


struct ErrorType {
    enum T : uint8_t {
        EngineError = 0,
        HostError = 1,
        GuestError = 2,
    };
    ErrorType() = delete;
};

struct SandboxObject
{
    uint8_t type;
    SandboxObject(uint8_t type): type(type) { }
};

struct SandboxString: public SandboxObject {
    uint8_t owned;
    uint16_t _reserved16;
    uint32_t size;
    char* data;

    static constexpr uint8_t Id = 0;

    SandboxString();
    ~SandboxString();
    void clear();
    void setConst(const char* str);
    void setConst(const char* str, uint32_t size);
    static SandboxString* from(JS::HandleValue value);
};

struct ExceptionResult: public SandboxObject
{
    ErrorType::T errorType;
    uint16_t _reserved16;
    SandboxString name;
    SandboxString message;
    SandboxString stack;

    static constexpr uint8_t Id = 1;

    ExceptionResult(): SandboxObject(Id), errorType(ErrorType::EngineError) {}
    ~ExceptionResult() {}
};

struct CompileResult: public SandboxObject
{
    ExecuteFlags::T flags;
    JS::PersistentRooted<JSScript*> script;

    CompileResult(ExecuteFlags::T flags);
    ~CompileResult() {}

    static constexpr uint8_t Id = 2;
};

_Static_assert(sizeof(SandboxObject) == 1, "SandboxObject");
_Static_assert(sizeof(SandboxString) == 12, "SandboxString");
_Static_assert(sizeof(ExceptionResult) == 40, "ExceptionResult");
_Static_assert(sizeof(CompileResult) > 4, "CompileResult");

WASM_EXPORT(init)
bool init(uint32_t aggressiveGCThreshold, uint32_t hardGCThreshold, uint32_t memoryLimit, LogLevel::T logLevel);

/**
 * Compile source code. The source code comes from static data.
 *
 * @param source - source code, UTF-8 encoded, ownership is NOT transferred to the engine.
 * @param fileName - name of the file, UTF-8 encoded, ownership is NOT transferred to the engine.
 * @param flags - flags to control the execution.
 * @return - CompileResult if success, ErrorResult otherwise.
 */
WASM_EXPORT(compile)
SandboxObject* compile(SandboxString* source, SandboxString* fileName, ExecuteFlags::T flags);


/**
 * Execute code in the Javascript engine. The code must be compiled first with the `exports.compile` function.
 *
 * The static data is assigned to `__sandbox__.arg` property.
 * If `__sandbox__._onDataFromHost` function if defined, the data will be filtered by it.
 *
 * If `ExecuteFlags::ReturnValue` is set, the result of the last statement will be available in the static data.
 * First, the result will be filtered by the `__sandbox__._onDataToHost` function if defined. Next, it
 * will be converted to string. Finally, the result will be set to `exports.getStaticData().result`.
 *
 * If error occurs, the function sets appropriate error information in static data.
 *
 * @param code - pointer to the compiled code.
 */
WASM_EXPORT(execute)
SandboxObject* execute(CompileResult* code, SandboxString* arg);

/**
 * Call a `__sandbox__._onCall` function with three arguments `groupId`, `functionId` and
 * argument from static data.
 *
 * If `__sandbox__._onDataFromHost` function if defined, the third argument will be filtered by it.
 *
 * The return value and error handling is the same as for the `exports.execute` function.
 *
 * @param groupId - group ID of the function to call.
 * @param functionId - function ID of the function to call.
 */
WASM_EXPORT(call)
SandboxObject* call(uint32_t groupId, uint32_t functionId, SandboxString* arg);

/**
 * Allocate memory on the engine's heap.
 * @return - pointer to the allocated memory, or null if allocation failed.
 */
WASM_EXPORT(malloc)
void* engineMalloc(uint32_t size);

/**
 * Reallocate memory on the engine's heap.
 *
 * If `ptr` is null, it behaves like `contextMalloc`.
 * If `ptr` points to shared buffer, new buffer is allocated on the engine's heap.
 *
 * @return - pointer to the allocated memory, or null if allocation failed.
 */
WASM_EXPORT(realloc)
void* engineRealloc(void* ptr, uint32_t oldSize, uint32_t newSize);

/**
 * Free memory on the engine's heap.
 * 
 * If `ptr` is null or `ptr` points to shared buffer, it does nothing.
 */
WASM_EXPORT(free)
void engineFree(void* ptr);


WASM_EXPORT(create)
SandboxObject* objectCreate(uint32_t type, uint32_t additionalSize);

WASM_EXPORT(dispose)
void objectDispose(SandboxObject* object);

WASM_EXPORT(getStackPointer)
uint32_t _getStackPointerDecl();

WASM_EXPORT(setStackPointer)
void _setStackPointerDecl(uint32_t value);

/**
 * Called once by the WASM to inform that it is initialized and ready to accept other calls.
 * Must be called before any other function. Host should throw an Exception to exit initialization
 * process leaving WASM module state intact.
 */
WASM_IMPORT(entry)
int hostEntry();

/**
 * Called to log messages to the host. Level of details is defined
 * in the `exports.getStaticData().logLevel`.
 *
 * This function cannot throw an exception.
 *
 * @param level - log level.
 * @param str - string to log, UTF-8 encoded, ownership is NOT transferred to the host.
 * @param len - length of the string in bytes.
 */
WASM_IMPORT(log)
void hostLog(LogLevel::T level, const void* str, uint32_t len);

/**
 * Call a host function with the given group ID, function ID and argument.
 * The additional argument is passed in the static data.
 *
 * Return value should be set to the static data.
 * If `__sandbox__._onDataFromHost` function if defined, the data will be filtered by it.
 *
 * @param groupId - group ID of the function to call.
 * @param functionId - function ID of the function to call.
 */
WASM_IMPORT(call)
SandboxObject* hostCall(uint32_t groupId, uint32_t functionId, SandboxString* arg);

/**
 * Host retuns total memory size allocated by this WASM module.
 * 
 * @return - total memory size in bytes.
 */
WASM_IMPORT(getMemorySize)
uint32_t getMemorySize();

/**
 * Host returns current stack pointer value.
 * 
 * This function is just passing the value from `getStackPointer` function exported
 * by the WASM post-processing tool.
 * 
 * @return - current stack pointer value.
 */
WASM_IMPORT(getStackPointer)
uint32_t getStackPointer();

#endif
