


TARGET := logdpcm-test
CPPFLAGS :=

CXXSRC := \
	../logdpcm/main.cpp \

CSRC := \
	../libvorbis/lib/window.c \
	../libvorbis/lib/mdct.c \
	../logdpcm/logdpcm.c \

CFLAGS :=
CPPFLAGS += -flto -O3 -g3 -fdata-sections -ffunction-sections -Wl,--gc-sections \
	-Wall -fno-strict-aliasing \
	-I../libvorbis/lib \
	-I../libvorbis/include \
	-I../libogg/include \

LDFLAGS :=

OUTDIR = ../dist
OBJDIR = $(OUTDIR)/obj/$(TARGET)
DEMO_FILE = $(OUTDIR)/$(TARGET)
MAP_FILE = $(OUTDIR)/obj/$(TARGET).map
OBJ := $(patsubst ../%.cpp,$(OBJDIR)/%.cpp.o,$(CXXSRC))
OBJ += $(patsubst ../%.c,$(OBJDIR)/%.c.o,$(CSRC))
COMMON_DEPS := Makefile
GCC_PREFIX :=

CC := $(GCC_PREFIX)gcc
CXX := $(GCC_PREFIX)g++
AR := $(GCC_PREFIX)ar

all: $(DEMO_FILE)

$(DEMO_FILE): $(LIB_FILE) $(OBJ) $(COMMON_DEPS)
	mkdir -p $(dir $@)
	$(CXX) $(CFLAGS) $(CPPFLAGS) $(LDFLAGS) -Xlinker -Map=$(MAP_FILE) $(OBJ) -o $@

$(OBJDIR)/%.c.o : ../%.c $(COMMON_DEPS)
	mkdir -p $(dir $@)
	$(CC) -MD -c $(CFLAGS) $(CPPFLAGS) $(OPUS_FLAGS) $(word 1,$<) -o $@

$(OBJDIR)/%.cpp.o : ../%.cpp $(COMMON_DEPS)
	mkdir -p $(dir $@)
	$(CXX) -MD -c $(CFLAGS) $(CPPFLAGS) $(OPUS_FLAGS) $(word 1,$<) -o $@

