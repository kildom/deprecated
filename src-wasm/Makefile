#
# Copyright 2025 Dominik Kilian
#
# Redistribution and use in source and binary forms,  with or without modification, are permitted provided
# that the following conditions are met:
# 1. Redistributions  of source code must retain  the above copyright notice,  this list of conditions and
#    the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
#    the following disclaimer in the documentation  and/or other materials provided with the distribution.
# THIS SOFTWARE IS PROVIDED  BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  "AS IS" AND ANY EXPRESS OR IMPLIED
# WARRANTIES, INCLUDING,  BUT NOT LIMITED TO,  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
# PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT,  INDIRECT,  INCIDENTAL,  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL DAMAGES (INCLUDING,  BUT NOT
# LIMITED TO,  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;  LOSS OF USE,  DATA,  OR PROFITS;  OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,  WHETHER IN CONTRACT,  STRICT LIABILITY, OR
# TORT  (INCLUDING NEGLIGENCE OR OTHERWISE)  ARISING IN ANY WAY OUT  OF THE USE OF THIS SOFTWARE,  EVEN IF
# ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#


ifeq (debug,$(MODE))
  CXXFLAGS=-O0 -g -DDEBUG=1
  LINK_TARGET=$(OUTDIR)/sandbox.wasm
  OPT_TARGET=$(OUTDIR)/non-existing-file
  MODE_MOZ=debug
  OPT_PARAM=-O0
  TS_BUNDLE_DEP=sandbox.wasm # This file already exists, so 'make' will not generate it.
else ifeq (release,$(MODE))
  CXXFLAGS=-flto -O2
  LINK_TARGET=$(OUTDIR)/obj/sandbox-no-opt.wasm
  OPT_TARGET=$(OUTDIR)/sandbox.wasm
  MODE_MOZ=release
  OPT_PARAM=-O2
  TS_BUNDLE_DEP=$(MODE).ts
else ifeq (size,$(MODE))
  CXXFLAGS=-flto -Oz
  LINK_TARGET=$(OUTDIR)/obj/sandbox-no-opt.wasm
  OPT_TARGET=$(OUTDIR)/sandbox.wasm
  MODE_MOZ=release
  OPT_PARAM=-Oz
  TS_BUNDLE_DEP=$(MODE).ts
else
  $(error Give mode parameter: MODE=debug, MODE=release, or MODE=size)
endif


DISTDIR=../dist
OUTDIR=../build/$(MODE)
MOZ_BUILD_DIR=../../moz$(MODE)
CPP=$(HOME)/.mozbuild/clang/bin/clang++
OPT=wasm-opt $(OPT_PARAM) --strip-debug
CXXFLAGS+=-target wasm32-wasi --sysroot $(HOME)/.mozbuild/sysroot-wasm32-wasi \
  -I $(MOZ_BUILD_DIR)/dist/include -D_WASI_EMULATED_SIGNAL \
  --include $(MOZ_BUILD_DIR)/js/src/js-confdefs.h \
  -Wno-unknown-warning-option
CPPFLAGS=-Wno-invalid-offsetof


LDFLAGS=\
    -Wl,--stack-first -z stack-size=1048576 \
    -Wl,--export=__stack_pointer \
    -Wl,--import-memory \
    -lwasi-emulated-signal \
    $(MOZ_BUILD_DIR)/js/src/build/libjs_static.a \
    $(MOZ_BUILD_DIR)/wasm32-wasip1/$(MODE_MOZ)/libjsrust.a \
    $(MOZ_BUILD_DIR)/mozglue/misc/AutoProfilerLabel.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/ConditionVariable_noop.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Decimal.o \
    $(MOZ_BUILD_DIR)/mozglue/static/lz4frame.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/MmapFaultHandler.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Mutex_noop.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Printf.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/StackWalk.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/TimeStamp.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/TimeStamp_posix.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Debug.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Now.o \
    $(MOZ_BUILD_DIR)/memory/build/Unified_cpp_memory_build0.o \
    $(MOZ_BUILD_DIR)/memory/mozalloc/Unified_cpp_memory_mozalloc0.o \
    $(MOZ_BUILD_DIR)/mfbt/Unified_cpp_mfbt0.o \
    $(MOZ_BUILD_DIR)/mfbt/Unified_cpp_mfbt1.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Uptime.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/SIMD.o \
    $(MOZ_BUILD_DIR)/third_party/fmt/Unified_cpp_third_party_fmt0.o


OBJ := $(patsubst ./%.cpp,$(OUTDIR)/obj/%.o,$(wildcard ./*.cpp))

all: $(DISTDIR)/$(MODE).wasm $(OUTDIR)/$(TS_BUNDLE_DEP)

clean:
	rm -Rf $(OUTDIR)

cleanobj:
	rm -Rf $(OUTDIR)/obj

rebuild: clean
	+make all

$(OUTDIR)/obj/marker.txt:
	mkdir -p $(OUTDIR)/obj
	mkdir -p $(DISTDIR)
	echo OK > $(OUTDIR)/obj/marker.txt

$(DISTDIR)/$(MODE).wasm: $(OUTDIR)/sandbox.wasm
	mkdir -p $(DISTDIR)
	npx tsx ../scripts/postprocess-wasm/main.ts $(OPT_PARAM) $< $@

$(OUTDIR)/$(MODE).ts: $(DISTDIR)/$(MODE).wasm
	npx tsx ../scripts/file-to-base64.ts $< $@

$(OPT_TARGET): $(OUTDIR)/obj/sandbox-no-opt.wasm
	$(OPT) -o $@ $<

$(LINK_TARGET): $(OBJ)
	$(CPP) $(CXXFLAGS) $(CPPFLAGS) $(OBJ) $(LDFLAGS) -o $@

$(OUTDIR)/obj/%.o : ./%.cpp $(OUTDIR)/obj/marker.txt Makefile
	$(CPP) -MD -c $(CXXFLAGS) $(CPPFLAGS) $(word 1,$<) -o $@

-include $(OUTDIR)/obj/*.d
