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


#ifndef _SANDBOX_HH_
#define _SANDBOX_HH_

#include <stdint.h>

#include "wasm.h"
#include "api.h"

struct DynamicContext {

    JS::PersistentRootedObject globalObject;
    JS::PersistentRootedObject sandboxObject;
    JS::PersistentRootedValue sandboxValue;
    JS::PersistentRootedObject memObject;
    JS::PersistentRootedValue memValue;

    DynamicContext(JSContext* cx):
        globalObject(cx),
        sandboxObject(cx),
        sandboxValue(cx),
        memObject(cx),
        memValue(cx)
    {
    }
};

extern JSContext* cx;
extern DynamicContext* dx;

extern uint32_t heapUsedPeak;

#define _LOG_GET_MACRO1(_1,  _2,  _3,  _4,  _5,  _6,  _7,  _8,  _9, _10, _11, _12, _13, _14, \
    _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, \
    _32, _33, N, ...) N
#define _LOG_GET_MACRO(...) _LOG_GET_MACRO1(__VA_ARGS__)
#define _LOG_NAMES4 _logFormat, _logFormat, _logFormat, _logFormat
#define _LOG_NAMES16 _LOG_NAMES4, _LOG_NAMES4, _LOG_NAMES4, _LOG_NAMES4
#define _LOG_NAMES32 _LOG_NAMES16, _LOG_NAMES16
#define _LOG_FUNC1(level, ...) _LOG_GET_MACRO(__VA_ARGS__, _LOG_NAMES32, _logStatic)(level, __VA_ARGS__)
#define _LOG_FUNC(...) _LOG_FUNC1(__VA_ARGS__)
#define logError(format, ...) _LOG_FUNC(LogLevel::Error, format, ##__VA_ARGS__)
#define logWarning(format, ...) _LOG_FUNC(LogLevel::Warning, format, ##__VA_ARGS__)
#define logInfo(format, ...) _LOG_FUNC(LogLevel::Info, format, ##__VA_ARGS__)
#define logDebug(format, ...) _LOG_FUNC(LogLevel::Debug, format, ##__VA_ARGS__)

void _logStatic(LogLevel::T level, const char* text);
void _logFormat(LogLevel::T level, const char* format, ...);

bool callJs(JSContext* cx, unsigned argc, JS::Value* vp);

#endif
