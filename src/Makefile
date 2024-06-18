

CPP=/home/doki/.mozbuild/clang/bin/clang++
OPT=../../binaryen-version_117/bin/wasm-opt -O2 --strip-debug
TARGET=sandbox
CXXFLAGS=-target wasm32-wasi --sysroot /home/doki/.mozbuild/sysroot-wasm32-wasi -I ../../mozrelease/dist/include -D_WASI_EMULATED_SIGNAL
CPPFLAGS=-Wno-invalid-offsetof
OPTFLAGS=-flto -O2
# TODO: use debug SpiderMonkey compilation
DEBUGFLAGS=-O0 -g #-DDEBUG=1
QUICKFLAGS=-O1 -g0
LDFLAGS=\
    -Wl,--stack-first -z stack-size=4194304 \
    -Wl,--export=__stack_pointer \
    ../../mozrelease/js/src/build/libjs_static.a \
    ../../mozrelease/wasm32-wasi/release/libjsrust.a \
    ../../mozrelease/mozglue/misc/AutoProfilerLabel.o \
    ../../mozrelease/mozglue/misc/ConditionVariable_noop.o \
    ../../mozrelease/mozglue/misc/Decimal.o \
    ../../mozrelease/mfbt/lz4frame.o \
    ../../mozrelease/mfbt/lz4hc.o \
    ../../mozrelease/mfbt/lz4.o \
    ../../mozrelease/mozglue/misc/MmapFaultHandler.o \
    ../../mozrelease/mozglue/misc/Mutex_noop.o \
    ../../mozrelease/mozglue/misc/Printf.o \
    ../../mozrelease/mozglue/misc/StackWalk.o \
    ../../mozrelease/mozglue/misc/TimeStamp.o \
    ../../mozrelease/mozglue/misc/TimeStamp_posix.o \
    ../../mozrelease/memory/build/Unified_cpp_memory_build0.o \
    ../../mozrelease/memory/mozalloc/Unified_cpp_memory_mozalloc0.o \
    ../../mozrelease/mfbt/Unified_cpp_mfbt0.o \
    ../../mozrelease/mfbt/Unified_cpp_mfbt1.o \
    ../../mozrelease/mozglue/misc/Uptime.o \
    ../../mozrelease/mfbt/xxhash.o \
    ../../mozrelease/mozglue/misc/SIMD.o


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

all: $(OUTDIR)/$(TARGET).opt.wasm

clean:
	rm -Rf $(OUTDIR)

cleanobj:
	rm -Rf $(OUTDIR)/obj

rebuild: clean
	+make all

$(OUTDIR)/obj/marker.txt:
	mkdir -p $(OUTDIR)/obj
	echo OK > $(OUTDIR)/obj/marker.txt

$(OUTDIR)/$(TARGET).opt.wasm: $(OUTDIR)/$(TARGET).wasm
	$(OPT) -o $(OUTDIR)/$(TARGET).opt.wasm $(OUTDIR)/$(TARGET).wasm

$(OUTDIR)/$(TARGET).wasm: $(OBJ)
	$(CPP) $(CXXFLAGS) $(CPPFLAGS) $(OBJ) $(LDFLAGS) -o $(OUTDIR)/$(TARGET).wasm

$(OUTDIR)/obj/%.o : ./%.cpp $(OUTDIR)/obj/marker.txt Makefile
	$(CPP) -MD -c $(CXXFLAGS) $(CPPFLAGS) $(word 1,$<) -o $@

-include $(OUTDIR)/obj/*.d
