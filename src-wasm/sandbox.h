#ifndef _SANDBOX_HH_
#define _SANDBOX_HH_

#include <stdint.h>

#include "wasm.h"
#include "sandbox-api.h"

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

#endif
