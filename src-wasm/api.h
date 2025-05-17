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


#ifndef _SANDBOX_API_H_
#define _SANDBOX_API_H_

#include <stdint.h>

#include "wasm.h"
#include "api-types.h"


/**
 * Initialize the engine.
 * 
 * This function must be called before any other function.
 * 
 * @param gcThresholdMin - heap size threshold when the GC goes into greedy mode.
 * @param heapUsedLimit - heap size threshold after full garbage collecting when fatal error indicating memory exhaustion.
 * @param memoryLimit - limit for the total memory used by WASM module. Must be the same as limit when creating the memory.
 * @param logLevel - level of logging.
 */
WASM_EXPORT(init)
bool init(uint32_t gcThresholdMin, uint32_t heapUsedLimit, uint32_t memoryLimit, LogLevel::T logLevel);


/**
 * Compile source code.
 *
 * @param source - source code, ownership is NOT transferred to the engine.
 * @param fileName - name of the file, ownership is NOT transferred to the engine. May be NULL.
 * @param flags - flags to control the execution.
 * @return - CompileResult if success, ExceptionResult otherwise. Ownership is transferred to the caller.
 */
WASM_EXPORT(compile)
SandboxAny* compile(SandboxString* source, SandboxString* fileName, ExecuteFlags::T flags);


/**
 * Execute code in the Javascript engine. The code must be compiled first with the `exports.compile` function.
 *
 * The `arg` argument is assigned to `__sandbox__.arg` property.
 * If `__sandbox__._onDataFromHost` function if defined, the argument will be filtered by it.
 *
 * If `ExecuteFlags::ReturnValue` is set, the result of the last statement will be converted to string
 * and returned by this function. If `__sandbox__._onDataToHost` function is defined, the result will
 * be filtered by it before conversion to string.
 *
 * @param code - pointer to the compiled code, ownership is NOT transferred to the engine.
 * @param arg - argument to pass to the code. Ownership is NOT transferred to the engine. May be NULL.
 * @return - result of the execution. SandboxString if success, ExceptionResult otherwise.
 *           Ownership is transferred to the caller. Can be NULL if `ExecuteFlags::ReturnValue` is not set.
 */
WASM_EXPORT(execute)
SandboxAny* execute(CompileResult* code, SandboxString* arg);


/**
 * Call a `__sandbox__._onCall` function with three arguments `groupId`, `functionId` and `arg` argument.
 *
 * If `__sandbox__._onDataFromHost` function if defined, the argument will be filtered by it.
 * 
 * If `__sandbox__._onDataToHost` function is defined, the result will be filtered by it before
 * conversion to string.
 *
 * @param groupId - group ID of the function to call.
 * @param functionId - function ID of the function to call.
 * @param arg - argument to pass to the function. Ownership is NOT transferred to the engine.
 *              May be NULL to pass `undefined` value.
 * @return - result of the call. SandboxString if success, ExceptionResult otherwise.
 *           Ownership is transferred to the caller.
 */
WASM_EXPORT(call)
SandboxAny* call(uint32_t groupId, uint32_t functionId, SandboxString* arg);


/**
 * Create a new object of the given type and size.
 * 
 * @param type - type of the object to create. Only `SandboxString` and `ExceptionResult` types are allowed.
 * @param size - for SandboxString, size of the string in bytes, for ExceptionResult must be 0.
 * @return - pointer to the new object. Ownership is transferred to the caller.
 */
WASM_EXPORT(create)
SandboxAny* objectCreate(uint32_t type, uint32_t size);


/**
 * Dispose object of any type.
 * 
 * @param object - pointer to the object to dispose. If it is NULL, nothing is done.
 */
WASM_EXPORT(dispose)
void objectDispose(SandboxAny* object);


/**
 * Get the current C/C++ stack pointer value.
 * 
 * Needed for snapshot functionality.
 * 
 * This is just a declaration, it is not implemented in the source code.
 * This function is added later by the WASM post-processing tool.
 * 
 * @return - total memory size in bytes.
 */
WASM_EXPORT(getStackPointer)
uint32_t _getStackPointerDecl();

/**
 * Set the C/C++ stack pointer value.
 * 
 * Needed for snapshot functionality.
 * 
 * This is just a declaration, it is not implemented in the source code.
 * This function is added later by the WASM post-processing tool.
 * 
 * @param value - new stack pointer value.
 */
WASM_EXPORT(setStackPointer)
void _setStackPointerDecl(uint32_t value);


/**
 * Call a host function with the given group ID, function ID and argument.
 *
 * If `__sandbox__._onDataToHost` function if defined, `arg` argument was filtered by it.
 *
 * If `__sandbox__._onDataFromHost` function if defined, the return value will be filtered by it.
 *
 * @param groupId - group ID of the function to call.
 * @param functionId - function ID of the function to call.
 * @param arg - argument to pass to the function. Ownership is NOT transferred to the host.
 */
WASM_IMPORT(call)
SandboxAny* hostCall(uint32_t groupId, uint32_t functionId, SandboxString* arg);


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
 * Called once by the WASM to inform that it is initialized and ready to accept other calls.
 * Must be called before any other function. Host should throw an Exception to exit initialization
 * process leaving WASM module state intact.
 * 
 * It is called during the post-processing of the WASM module. It should not be called in runtime.
 */
WASM_IMPORT(entry)
int hostEntry();


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
