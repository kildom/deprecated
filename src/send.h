#ifndef _SEND_H_
#define _SEND_H_

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

#include "wasm.h"

WASM_IMPORT(sandbox, clearValues) void clearValues();
bool sendError(JS::HandleValue errorVal);

extern JSFunctionSpec sandboxSendFunctions[];

#endif
