
PATH=C:\mingw\bin

g++ -c -DCOMPILER_GCC32 -O2 -o main.o main.cpp

windres -O coff strings.rc strings.o

g++ -O2 -o penpr.exe main.o strings.o

strip penpr.exe

pause

