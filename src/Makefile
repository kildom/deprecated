

ifeq (debug,$(MODE))
  CXXFLAGS=-O0 -g -DDEBUG=1
  MODE_MOZ=debug
  OPT=echo
else ifeq (release,$(MODE))
  CXXFLAGS=-flto -O2
  MODE_MOZ=release
  OPT=strip
else ifeq (size,$(MODE))
  CXXFLAGS=-flto -Oz
  MODE_MOZ=release
  OPT=strip
else
  $(error Give mode parameter: MODE=debug, MODE=release, or MODE=size)
endif


DISTDIR=../dist
LINK_TARGET=$(DISTDIR)/smsmall
OUTDIR=../build/$(MODE)
MOZ_BUILD_DIR=../../moz$(MODE)
CPP=$(HOME)/.mozbuild/clang/bin/clang++
CXXFLAGS+=-I $(MOZ_BUILD_DIR)/dist/include
CPPFLAGS=-Wno-invalid-offsetof


LDFLAGS=\
    $(MOZ_BUILD_DIR)/js/src/build/libjs_static.a \
    $(MOZ_BUILD_DIR)/mozglue/misc/AutoProfilerLabel.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Decimal.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/MmapFaultHandler.o \
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
    $(MOZ_BUILD_DIR)/mozglue/misc/SIMD.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/Mutex_posix.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/ConditionVariable_posix.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/SIMD_avx2.o \
    $(MOZ_BUILD_DIR)/mozglue/misc/SSE.o \
    $(MOZ_BUILD_DIR)/x86_64-unknown-linux-gnu/$(MODE_MOZ)/libjsrust.a \


OBJ := $(patsubst ./%.cpp,$(OUTDIR)/obj/%.o,$(wildcard ./*.cpp))

all: $(LINK_TARGET)

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

$(LINK_TARGET): $(OBJ)
	$(CPP) $(CXXFLAGS) $(CPPFLAGS) $(OBJ) $(LDFLAGS) -Xlinker -Map=$(LINK_TARGET).map  -o $@
	$(OPT) $(LINK_TARGET)

$(OUTDIR)/obj/%.o : ./%.cpp $(OUTDIR)/obj/marker.txt Makefile
	$(CPP) -MD -c $(CXXFLAGS) $(CPPFLAGS) $(word 1,$<) -o $@

-include $(OUTDIR)/obj/*.d
