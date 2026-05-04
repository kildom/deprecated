
INCLUDE_DIRS = -I. -I../build/botan/include/botan-3

all:
	mkdir -p ../build/obj
	mkdir -p ../dist
	g++ -std=c++20 -Wall -Wextra -Werror -O3 -g -c $(INCLUDE_DIRS) main.cpp -o ../build/obj/main.o
	g++ -std=c++20 -Wall -Wextra -Werror -O3 -g ../build/obj/main.o \
	    ../build/botan/lib/libbotan-3.a \
		-o ../dist/SqliteNode
