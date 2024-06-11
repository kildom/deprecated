

CPP=/root/.mozbuild/clang/bin/clang++
OPT=../../binaryen-version_117/bin/wasm-opt -Oz --strip-debug
TARGET=sandbox
CXXFLAGS=-target wasm32-wasi --sysroot /root/.mozbuild/sysroot-wasm32-wasi -I ../../obj/dist/include -D_WASI_EMULATED_SIGNAL
CPPFLAGS=-Wno-invalid-offsetof
OPTFLAGS=-flto -Oz
# TODO: use debug SpiderMonkey compilation
DEBUGFLAGS=-O0 -g #-DDEBUG=1
QUICKFLAGS=-O1 -g0
LDFLAGS=\
    -Wl,--stack-first -z stack-size=4194304 \
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


ifeq (1,$(DEBUG))
  CXXFLAGS += $(DEBUGFLAGS)
  OPT=\#
  OUTDIR = ../debug
else
  ifeq (1,$(QUICK))
    CXXFLAGS += $(QUICKFLAGS)
    OPT=\#
    OUTDIR = ../quickbuild
  else
    CXXFLAGS += $(OPTFLAGS)
    OUTDIR = ../release
  endif
endif

OBJ := $(patsubst ./%.cpp,$(OUTDIR)/obj/%.o,$(wildcard ./*.cpp))

all: $(OUTDIR)/$(TARGET).wasm

clean:
	rm -Rf $(OUTDIR)

cleanobj:
	rm -Rf $(OUTDIR)/obj

rebuild: clean
	+make all

$(OUTDIR)/obj/marker.txt:
	mkdir -p $(OUTDIR)/obj
	echo OK > $(OUTDIR)/obj/marker.txt

$(OUTDIR)/$(TARGET).wasm: $(OBJ)
	$(CPP) $(CXXFLAGS) $(CPPFLAGS) $(OBJ) $(LDFLAGS) -o $(OUTDIR)/$(TARGET).wasm
	$(OPT) -o $(OUTDIR)/$(TARGET).opt.wasm $(OUTDIR)/$(TARGET).wasm

$(OUTDIR)/obj/%.o : ./%.cpp $(OUTDIR)/obj/marker.txt Makefile
	$(CPP) -MD -c $(CXXFLAGS) $(CPPFLAGS) $(word 1,$<) -o $@

-include $(OUTDIR)/obj/*.d
