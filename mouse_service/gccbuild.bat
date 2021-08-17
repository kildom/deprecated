path=c:\gcc\bin
g++ -o pen_service.exe -O2 -D_UNICODE -DUNICODE config.cpp encoding.cpp main.cpp pen_service.cpp stdafx.cpp
strip pen_service.exe
