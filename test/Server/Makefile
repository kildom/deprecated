CXX ?= c++
TARGET := ../../build/test/server_test_app
SOURCES := main.cpp ../../src/linux/Server-linux.cpp

CPPFLAGS ?=
CXXFLAGS ?= -std=c++17 -Wall -Wextra -pedantic -pthread
LDFLAGS ?=

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(SOURCES)
	mkdir -p $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -o $@ $(SOURCES) $(LDFLAGS)

clean:
	rm -f $(TARGET)

