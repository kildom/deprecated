# Compiler and target
CXX := g++
TARGET := ../dist/test1

# Directories
BUILD_DIR := ../build
OBJ_DIR := $(BUILD_DIR)/obj
DIST_DIR := ../dist

# Source and object files
SOURCES := $(wildcard *.cpp)
OBJECTS := $(SOURCES:%.cpp=$(OBJ_DIR)/%.o)
DEPENDS := $(SOURCES:%.cpp=$(OBJ_DIR)/%.d)

# Compile and link flags
CXXFLAGS := -Wall -Wextra -std=c++17 -fPIC -m32
LDFLAGS := -Wall -Wextra -m32

# Default target
all: $(TARGET)

# Create directories if they don't exist
$(OBJ_DIR) $(DIST_DIR):
	@mkdir -p $@

# Compile source files to object files with dependency generation
$(OBJ_DIR)/%.o: %.cpp | $(OBJ_DIR)
	$(CXX) $(CXXFLAGS) -MMD -MP -c $< -o $@

# Link object files to executable
$(TARGET): $(OBJECTS) | $(DIST_DIR)
	$(CXX) $(LDFLAGS) $(OBJECTS) -o $@

# Include dependency files
-include $(DEPENDS)

# Clean targets
.PHONY: clean clean-all

clean:
	rm -f $(OBJECTS) $(DEPENDS)

clean-all: clean
	rm -f $(TARGET)
	rm -rf $(BUILD_DIR) $(DIST_DIR)

# Declare phony targets
.PHONY: all
