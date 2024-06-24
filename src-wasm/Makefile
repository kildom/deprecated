

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
CXXFLAGS+=-target wasm32-wasi --sysroot $(HOME)/.mozbuild/sysroot-wasm32-wasi -I $(MOZ_BUILD_DIR)/dist/include -D_WASI_EMULATED_SIGNAL
CPPFLAGS=-Wno-invalid-offsetof


LDFLAGS=\
    -Wl,--stack-first -z stack-size=1048576 \
    -Wl,--export=__stack_pointer \
    -Wl,--import-memory \
    -lwasi-emulated-signal \
    $(MOZ_BUILD_DIR)/js/src/build/libjs_static.a \
    $(MOZ_BUILD_DIR)/wasm32-wasi/$(MODE_MOZ)/libjsrust.a \
    $(MOZ_BUILD_DIR)/mozglue/misc/AutoProfilerLabel.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/ConditionVariable_noop.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Decimal.o \
    $(MOZ_BUILD_DIR)/mfbt/lz4frame.o \
    $(MOZ_BUILD_DIR)/mfbt/lz4hc.o \
    $(MOZ_BUILD_DIR)/mfbt/lz4.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/MmapFaultHandler.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Mutex_noop.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Printf.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/StackWalk.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/TimeStamp.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/TimeStamp_posix.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Debug.o \
    $(MOZ_BUILD_DIR)/memory/build/Unified_cpp_memory_build0.o \
    $(MOZ_BUILD_DIR)/memory/mozalloc/Unified_cpp_memory_mozalloc0.o \
    $(MOZ_BUILD_DIR)/mfbt/Unified_cpp_mfbt0.o \
    $(MOZ_BUILD_DIR)/mfbt/Unified_cpp_mfbt1.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Uptime.o \
    $(MOZ_BUILD_DIR)/mfbt/xxhash.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/SIMD.o


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
