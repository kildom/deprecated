 Program konwertuje pliki źródłowe napisane w OpenGL Shading Language na pliki C lub C++, które można następnie wkompilować w program i z nich kożystać. Dodatkowo poszerza SL o następujące dyrektywy:

  - **#shader nazwa ( [parametr1, [parametr2, ...]] )**
    
    Każdy shader rozpoczyna się tą dyrektywą. W pliku wynikowym będzie on dostępny pod zadaną nazwą. To umożliwia istnienie wielu shader'ów w jednym pliku. Opcjonalne parametry mogą być zmienione przez programistę przed załadowaniem shader'a do OpenGL'a. Mogą to być liczby lub wektory liczb.
    
  - **#precompiler wersja**
    
    Umożliwia dopasowanie preparsera do odpowiedniej wersji kodu źródłowego. Aktualnie tylko wartość 100 jest możliwa (wersja 1.0).
    
  - **#common nazwa ( [parametr1, [parametr2, ...]] )** (w budowie)
    
    Fragment kodu, który może zostać dołączony do dowolnego shadera.
    
  - **#using nazwa ( [wartość1, [wartość2, ...]] )** (w budowie)
    
    Dołączanie bloku #common do shader'a.
    
  - **#include "plik"** (w budowie)
    
    Dołączanie zewnętrznego pliku źródłowego.
