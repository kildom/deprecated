#ifndef _SANDBOX_HH_
#define _SANDBOX_HH_

#include <stdint.h>

#include <jsapi.h>
#include <js/Initialization.h>
#include <js/Exception.h>
#include <js/CompilationAndEvaluation.h>
#include <js/SourceText.h>
#include <js/Conversions.h>
#include <js/MemoryFunctions.h>
#include <js/Exception.h>
#include <js/ArrayBuffer.h>

struct Encodings {
    enum T : uint32_t {
        Utf8 = 0,
        Latin1 = 1,
        Utf16 = 2,
    };
    Encodings() = delete;
};

struct SandboxFlags {
    enum T : uint32_t {
        Latin1Allowed = 1,
        Utf16Allowed = 2,
    };
    SandboxFlags() = delete;
};

struct ExecuteFlags {
    enum T : uint32_t {
        Script = 0,
        Module = 1,
        TransferBufferOwnership = 2,
        ReturnValue = 4,
    };
    ExecuteFlags() = delete;
};


static const uint32_t SHARED_BUFFER_SIZE = 16 * 1024;

extern JSContext* cx;
extern SandboxFlags::T sandboxFlags;
extern uint8_t sharedBuffer[SHARED_BUFFER_SIZE];

struct DynamicContext {

    JS::PersistentRootedObject globalObject;
    JS::PersistentRootedObject sandboxObject;
    JS::PersistentRootedValue sandboxValue;
    JS::PersistentRootedObject recvObject;
    JS::PersistentRootedValue recvValue;
    JS::PersistentRootedValue recvPendingErrorValue;

    DynamicContext(JSContext* cx):
        globalObject(cx),
        sandboxObject(cx),
        sandboxValue(cx),
        recvObject(cx),
        recvValue(cx),
        recvPendingErrorValue(cx)
    {
    }

};

extern DynamicContext* dx;

bool reportEngineError(const char* message);
void reportPendingException();

#endif
