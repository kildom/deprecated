

Etapy tworzenia plotu:

* Podziel plot na niepołączone czarne obszary i wykonuj
  kolejne czynności na każdym obszarze oddzielnie.
* Wyznaczenie odległości każdego czarnego pixela od najbliższego białego (metryka kartezjańska).
  Może być wykonane w sposób zoptymalizowany:
  * Obliczyć odległość w metryce taksówkowej (pixel ma o jeden większą od najmniejszej z 4 sąsiadujących pixeli)
  * Wyznaczyć odległość w metryce kartezjańskiej
    * Każdej odległości w metryce taksówkowej odpowiada kilka
      odległości w metryce kartezjańskiej.
    * Dla każdego pixela czarnego sprawdź wszystkie pixele
      w odległości w metryce taksówkowej posortowane od
      najmniejszej odległości kartezjańskiej. Lista powinna
      być przygotowana wcześniej ze względymi współrzędnymi.
    * Pierwszy napotkany biały pixel to odległość kartezjańska.
* Utwórz listę czarnych pixeli
* Przemieszaj losowo listę
* Posortuj listę od namniejsze odległości
* Idź po liście i usuwaj kolejne pixele z obrazka jeżeli usunięcie
  nie spowoduje przerwania ciągłości czarnego obszaru.
  Wystarczy przeanalizować 8 sąsiadujących pixeli, żeby to
  stwierdzić.
  Dodatkowo trzeba też sprawdzić, żeby nie usuwać krańcowego
  pixela, który kończy już maksymalnie cienką linię.
  Chyba analiza 8 sąsiadów wystarczy.
* Usuwanie trwa aż usuniemy wszystkie pixele z odległością
  mniejszą niż promień frezowania.
* Teraz idziemy od tyłu listy (od największej odległości)
  i oznaczamy pixele jako "czerwone" czyli obszar do frezowania
  dużych powierzchni. Kończymy gdy dojdziemy do odległości
  `2R - d`, gdzie `d` to margines bezpieczeństwa.
  Przy oznaczaniu nadal sprawdzamy ciągłość obszaru czarnego.
* Idziemy nadal od tyłu listy i oznaczamy pixele jako "białe"
  aż dojdziemy gdzie skończyliśmy na w pierwszym etapie przetwarzania list, czyli w kolejności rosnącej.
* Teraz:
  * białe pixele to nadal tło,
  * czarne pixele wyznaczają linie do frezowania,
  * czerwone pixele wyznaczają powierzchnie do frezowania.
    Czerwone pixele muszą być pokryte w 100% przez frezowanie.
* W pierwszej wersji można pominąć czerwone pixele
  (np. ostrzeżenie jeżeli istnieją). Docelowo, czerwone pixele
  powinny się zamienić w jedeń ciąg czarnych pixeli, takich, że
  frezowanie po czarnych pokrywa czerwone w 100%.
* Wyznaczyć wszystkie:
  * krańce - pixel, który po usunięciu pozostawia nadal czarny obszar w jednej części.
  * rozwidlenia - pixel, który po usunięciu pozostawia trzy lub więcej części czarnego obszaru.
  * prawdopodobnie wystarczy analiza 8 sąsiadujących pixeli.
* Wyznaczyć ścieżki między krańcami i rozwidleniami wzdłuż
  czarnych pixeli.
  * Wszystkie czarne pixele muszą zostać wykorzystane.
  * Ścieżka składa się z linii (lub łuków jeżeli jest wspierane).
    Linia zaczyna z pierwszego punktu i idąc po kolejnych
    pixelach linia się wydłuża aż odsunie się zbytnio od poprzednich pixeli, wtedy linia się kończy na poprzednim i zaczyna się nowa linia.
  * Jeżeli ostatnia linia ścieżki jest zbyt krótka, można ją
    wydłużyć zmniejszając przedostatnią linię (na ile na to pozwalają odległości od pixeli).
* Wybrać dowolny kraniec (rozwidlenie jeżeli nie ma krańców)
  i iść po kolejnych ścieżkach aż nie da się iść dalej.
  * Powtarzaj aż wszystkie ścieżki zostaną pokryte.
  * Późniejsza optymalizacja może szukać optymalnych krańców
    żeby zminimalizować ruchy bez frezowania.
* Wygenerować G-code na podstawie ścieżek.
  * Późniejsza optymalizacja może wykorzystać algorytmy
    komiwojażera żeby zminimalizować ruchy bez frezowania.
* Wygenerować podgląd ścieżek w SVG.

Inne:
* Dobra czcionka do frezowania: Nunito (z Google Fonts)
* Też inne z Google Fonts z kategorii sans-serif rounded
