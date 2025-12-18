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


#ifndef _SANDBOX_API_TYPES_H_
#define _SANDBOX_API_TYPES_H_

#include <stdint.h>
#include <jsapi.h>


struct ExecuteFlags {
    enum T : uint8_t {
        /** Execute the code as a script */
        Script = 0,
        /** Execute the code as a module */
        Module = 1,
        /** Return the result of the last statement */
        ReturnValue = 2,
    };
    ExecuteFlags() = delete;
};


struct LogLevel {
    enum T : uint8_t {
        /** Disable logging */
        None = 0,
        /** Error level logging */
        Error = 1,
        /** Warning level logging */
        Warning = 2,
        /** Info level logging */
        Info = 3,
        /** Debug level logging */
        Debug = 4,
    };
    LogLevel() = delete;
};


struct ErrorType {
    enum T : uint8_t {
        /** Error thrown by the engine to indicate internal problem with the engine */
        EngineError = 0,
        /** Error thrown by the host */
        HostError = 1,
        /** Error thrown by the guest */
        GuestError = 2,
    };
    ErrorType() = delete;
};


/**
 * Abstract base class for objects used to communicate between the host and the engine.
 */
struct SandboxAny
{
    /** Type of this object. Values defined by the `Id` field of each class. */
    uint8_t type;
    /** Non-zero indicate object placed in static memory that should not be deallocated. */
    uint8_t isStatic;
protected:
    SandboxAny(uint8_t type): type(type), isStatic(0) {}
};


/**
 * String object.
 *
 * It is UTF-8 encoded string.
 * The actual string characters are stored in the memory just after this structure.
 * After the string characters, there is a null terminator to be compatible with C-style strings.
 * The null terminator is not included in the size of the string.
 */
struct SandboxString: public SandboxAny
{
    uint16_t _reserved16;
    /** Size of the string in bytes not including null terminator. */
    uint32_t size;

    /** Object type for SandboxString is 0. */
    static constexpr uint8_t Id = 0;

    SandboxString(uint32_t size): SandboxAny(Id), size(size) { data()[size] = 0; }
    ~SandboxString() {}
    char* data() { return (char*)(this + 1); }
    static SandboxString* from(JS::HandleValue value);
};


/**
 * Exception result object.
 *
 * Returned to indicate an error occurred during execution.
 * This object owns the strings in its fields and it is responsible for deallocating them.
 * All strings are optional.
 */
struct ExceptionResult: public SandboxAny
{
    /** Type of the error. */
    ErrorType::T errorType;
    uint8_t _reserved8;
    /** Error name (e.g. class name used to create that error). */
    SandboxString* name;
    /** Error message. */
    SandboxString* message;
    /** Error stack trace. */
    SandboxString* stack;

    /** Object type for ExceptionResult is 1. */
    static constexpr uint8_t Id = 1;

    ExceptionResult(): SandboxAny(Id), errorType(ErrorType::EngineError), name(nullptr), message(nullptr), stack(nullptr) {}
    ~ExceptionResult();
};


#endif
