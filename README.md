

Etapy tworzenia plotu:

* Podziel plot na niepołączone czarne obszary i wykonuj
  kolejne czynności na każdym obszarze oddzielnie.
  * W szczególnym przypadku, kiedy cały obszar mieści się w promieniu frezowania
    plus margines bezpieczeństwa, to można od razu wyznaczyć jego środek
    i oznaczyć jako punkt do frezowania a nie ścieżka.
* Wyznaczenie odległości każdego czarnego pixela od najbliższego białego (metryka kartezjańska).
  Może być wykonane w sposób zoptymalizowany:
  * Obliczyć odległość w metryce taksówkowej (pixel ma o jeden większą od najmniejszej z 4 sąsiadujących pixeli)
  * Wyznaczyć odległość w metryce kartezjańskiej
    * Każdej odległości w metryce taksówkowej odpowiada kilka
      odległości w metryce kartezjańskiej.
    * Dla każdego pixela czarnego sprawdź wszystkie pixele
      w odległości w metryce taksówkowej posortowane od
      najmniejszej odległości kartezjańskiej. Czyli inaczej,
      sprawdź rąb wokół pixela zaczynając od środka każdej krawędzi,
      potem idąc w stronę narożników. W ten sposób powstanie 8 punków
      (o tej samej odległości kartezjańskiej) kroczących pod kątem 45 stopni
      w stronę narożników.
    * Pierwszy napotkany biały pixel to odległość kartezjańska.
    * Może kolejna optymalizacja: jeżeli znamy odległość w obu metrykach
      pixeli sąsiadujących, to da się wybrać zakres możliwych odległości
      kartezjańskich dla danego piksela. To pozwoli pominąć sprawdzanie
      pixeli, które na pewno nie będą odpowiednie.
      Ta optymalizacja wymaga dokładnej analizy, bo mogą się zdarzyć
      skrajne przypadki, gdzie prostste zasady mogą nie zadziałać.
* Utwórz listę czarnych pixeli
* Przemieszaj losowo listę
* Posortuj listę od namniejsze odległości
* Idź po liście i usuwaj kolejne pixele z obrazka.
  Jeżeli usunęło się jakiś pixel obok pixela z tą samą odległością,
  to trzeba jeszcze raz sprawdzić ten pixel sąsiadujący.
  Można usuwać pixel tylko pod następującymi warunakmi:
  * usunięcie nie spowoduje przerwania ciągłości czarnego obszaru.
    Wystarczy przeanalizować 8 sąsiadujących pixeli, żeby to
    stwierdzić.
  * Dla PCB to już wszystkie warunki, dla grafiki, trzeba jeszcze
    spełnić kolejne.
  * Sprawdzić czy usunięcie pixela nie spowoduje, że jakiś biały 
    pixel będzie miał odlegość większą niż jakaś zadana od czarnego pixela.
    * Wartość zadana to może być sqrt(2) * R + margines bezpieczeństwa.
      Taka wartość spowoduje, że kąt prosty i rozwarty będzie frezowany
      bez dodatkowego wyjeżdżania, a kąt ostry będzie frezowany z dodatkowym
      wyjeżdżaniem.
    * TEN ALGORYTM MOŻE NIE ZADZIAŁAĆ:
      * Po tym jak są wyznaczone odległości czarnych do białych pixeli,
        trzeba przejść po wszystkich białych pixelach przy krawędzi
        czarnego obszaru. Dla każdego białego pixela przejść po okręugu
        o promieniu zadanym (powyżej) i wybrać czarny pixel z największą
        odległością od białego pixela. Jeżeli ta odległość jest większa
        niż promień frezowania, to usunięcie pixela jest niedozwolone.
        * Poźniejsza optymalizacja: Jeżeli idąc po okręgu napotkamy więcej
          ciągłych łuków, to wyznaczamy punkt max. dla każdego łuku
          i otrzymujemy zbiór punków. Teraz warunek jest taki, że dla
          przynajmniej jeden z tego zbioru musi przeżyć.
    * INNY ALTERNAWYWNY:
      * Po wyznaczeniu czarnych pixeli, przejść po krawędzi i sprawdzić odległości.
        Jeżeli odległość jest większa niż zadana, to wyznaczyć biały pixel na krawędzi
        z największą taką odległością i oznaczyć pixel na obszarze czarnym po promienu
        wokół tego białego pixela, taki, że odległość od tego białego pixela jest największa.
        Oznaczyć ten czarny pixel jako "nie do usunięcia". Przeprowadzić procedurę usuwania
        pixeli jeszcze taz. Optymalizacja: po wyznaczeniu pierwszego takiego białego pixela,
        można wyszukać kolejne pod warunkiem, że są w odległości większej niż zadana od
        poprzedniego białego pixela.
        Całość trzeba powtarzać aż nie będzie białych pixeli, które mają odległość
        większą niż zadana.
    * JSZCZE INNA ALTERNATYWA (pozwala ładnie odwzorować litery z bardzo cienkimi liniami):
      * Jeżeli usuwamy pixel, to sprawdzamy sąsiadujące, jeżeli to jest usuwanie "końcówki"
        linii, to przechodzimy jeszcze kilka pixeli (może 0.2 * R) po danej linii i sprawdzamy,
        czy jest ona maksymalnie cienka. Jeżeli tak jest, to nie usuwamy tej końcówki i
        oznaczamy ją jako "nie do usunięcia" (żeby przyspieszyć późniejsze kolejne sprawdzanie).
        Jeżeli sprawdzając cienką linię napotkamy rozwidlenie, to też nie usuwamy tej końcówki.
        WADA: to działa dobrze dla cienkich linii, ale nie zadziała dobrze dla kątów ostrych.
              Można wtedy po tym algorytmie zastosować ten powyżej "INNY ALTERNAWYWNY".
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
* Późniejsza optymalizacja:
  * Założyć minimalny i maksymalny promień frezowania (dla frezów trójkątnych)
    * Piksele na ścieżce będą miały przypisane różne promienie,
    * Wtedy generowanie ścieżek będzie też generować współrzędną Z.

Inne:
* Dobra czcionka do frezowania: Nunito (z Google Fonts)
* Też inne z Google Fonts z kategorii sans-serif rounded