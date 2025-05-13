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

#define logError(format, ...) _log(LogLevel::Error, format, ##__VA_ARGS__)
#define logWarning(format, ...) _log(LogLevel::Warning, format, ##__VA_ARGS__)
#define logInfo(format, ...) _log(LogLevel::Info, format, ##__VA_ARGS__)
void _log(LogLevel::T level, const char* format, ...);

bool callJs(JSContext* cx, unsigned argc, JS::Value* vp);

#endif
