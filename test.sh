#!/bin/bash
set -e

export PATH=/root/.mozbuild/clang/bin:$PATH

cd spidermonkey-embedding-examples/examples

OPTS='-flto -Oz -target wasm32-wasi --sysroot /root/.mozbuild/sysroot-wasm32-wasi -I ../../obj/dist/include -D_WASI_EMULATED_SIGNAL'

echo ===== COMPILE =====
clang++ $OPTS -c -o hello.o hello.cpp
clang++ $OPTS -c -o boilerplate.o boilerplate.cpp

echo ===== LINK =====
clang++ $OPTS -o hello.wasm hello.o boilerplate.o \
    ../../obj/js/src/build/libjs_static.a \
    ../../obj/wasm32-wasi/release/libjsrust.a \
    ../../obj/mozglue/misc/AutoProfilerLabel.o \
    ../../obj/mozglue/misc/ConditionVariable_noop.o \
    ../../obj/mozglue/misc/Decimal.o \
    ../../obj/mfbt/lz4frame.o \
    ../../obj/mfbt/lz4hc.o \
    ../../obj/mfbt/lz4.o \
    ../../obj/mozglue/misc/MmapFaultHandler.o \
    ../../obj/mozglue/misc/Mutex_noop.o \
    ../../obj/mozglue/misc/Printf.o \
    ../../obj/mozglue/misc/StackWalk.o \
    ../../obj/mozglue/misc/TimeStamp.o \
    ../../obj/mozglue/misc/TimeStamp_posix.o \
    ../../obj/memory/build/Unified_cpp_memory_build0.o \
    ../../obj/memory/mozalloc/Unified_cpp_memory_mozalloc0.o \
    ../../obj/mfbt/Unified_cpp_mfbt0.o \
    ../../obj/mfbt/Unified_cpp_mfbt1.o \
    ../../obj/mozglue/misc/Uptime.o \
    ../../obj/mfbt/xxhash.o \
    ../../obj/mozglue/misc/SIMD.o

echo ===== OPTIMIZE =====
../../binaryen-version_117/bin/wasm-opt -Oz --strip-debug -o hello.opt.wasm hello.wasm
ls -la hello*.wasm
