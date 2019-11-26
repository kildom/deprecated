
TARGET = test

INCLUDE = \
	-I. \
	-I..

# C and C++ flags
CPPFLAGS   = \
	-O0 -g3 -fdata-sections -ffunction-sections -Wl,--gc-sections \
	-fno-strict-aliasing -fshort-enums -municode \
	-DUNICODE

# C flags
CFLAGS   = 

# C++ flags
CXXFLAGS   = 

# Assembler flags
ASMFLAGS =

LIBS = -lm -lkernel32 -luser32 -lgdi32

OBJ = win.o ../mainloop.o

all: $(TARGET).exe

clean:
	rm -f $(OBJ) $(TARGET).exe

.cpp.o: Makefile
	c++ -c $(CPUFLAGS) $(CPPFLAGS) $(CXXFLAGS) $(INCLUDE) -o $@ $<

.c.o: Makefile
	gcc -c $(CPUFLAGS) $(CPPFLAGS) $(CFLAGS) $(INCLUDE) -o $@ $<

.S.o: Makefile
	gcc -c $(CPUFLAGS) $(CPPFLAGS) $(ASMFLAGS) $(INCLUDE) -o $@ $<

$(TARGET).exe: $(OBJ) Makefile
	c++ $(CPUFLAGS) $(CPPFLAGS) $(CXXFLAGS)  $(OBJ) $(LIBS) -o $(TARGET).exe
