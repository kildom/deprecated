CXX ?= c++
TARGET := ../../build/test/server_test_app

SOURCES := main.cpp \
           test_Server.cpp \
           test_EncryptedSocket.cpp \
           ../../src/linux/Server-linux.cpp \
           ../../src/EncryptedSocket.cpp

BOTAN_INC := ../../build/botan/include/botan-3
BOTAN_LIB := ../../build/botan/lib/libbotan-3.a

CPPFLAGS_INTERNAL := -I$(BOTAN_INC)
CPPFLAGS ?=
CXXFLAGS ?= -std=c++20 -Wall -Wextra -pedantic -pthread
LDFLAGS ?=

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(SOURCES)
	mkdir -p $(dir $@)
	$(CXX) $(CPPFLAGS) $(CPPFLAGS_INTERNAL) $(CXXFLAGS) -o $@ $(SOURCES) $(BOTAN_LIB) $(LDFLAGS)

clean:
	rm -f $(TARGET)

