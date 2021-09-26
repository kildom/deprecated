
TARGET = test

INCLUDE = \
	-I. \
	-I..

# C and C++ flags
CPPFLAGS   = \
	-O0 -g3 -fdata-sections -ffunction-sections -Wl,--gc-sections \
	-fno-strict-aliasing -fshort-enums

# C flags
CFLAGS   = 

# C++ flags
CXXFLAGS   = 

# Assembler flags
ASMFLAGS =

LIBS = -lm -lkernel32 -luser32 -lgdi32 -lws2_32

OBJ = main.o mongoose/mongoose.o

all: $(TARGET).exe

clean:
	rm -f $(OBJ) $(TARGET).exe

.cc.o:
	c++ -c $(CPUFLAGS) $(CPPFLAGS) $(CXXFLAGS) $(INCLUDE) -o $@ $<

.c.o:
	gcc -c $(CPUFLAGS) $(CPPFLAGS) $(CFLAGS) $(INCLUDE) -o $@ $<

.S.o:
	gcc -c $(CPUFLAGS) $(CPPFLAGS) $(ASMFLAGS) $(INCLUDE) -o $@ $<

$(TARGET).exe: $(OBJ) Makefile
	c++ $(CPUFLAGS) $(CPPFLAGS) $(CXXFLAGS)  $(OBJ) $(LIBS) -o $(TARGET).exe
