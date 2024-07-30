# Reference counting GC

Wymagana jest dodatkowa flaga, która mówi, że referencja do danego objektu się zmieniła.
Ta sama flaga może być wykożystana do rozróźniania "rooted" objektów (takich, które mają zdalne referencje).

```c

#define REF_CHAGED_FLAG (1 << 31)

void ref() {
  refCounter++;
}

void unref() {
  refCounter = (refCounter - 1) & ~REF_CHAGED_FLAG;
  if (refCounter == 0) delete
}

void passref() { // pass reference to other owner
  refCounter &= ~REF_CHAGED_FLAG;
}

// alternatywnie, można umieścić flagę na najniższym bicie:
ref: refCounter += 2
unref: (refCounter - 2) & ~REF_CHAGED_FLAG

// albo odwrócić znaczenie flagi
ref: refCounter += 2
unref: (refCounter - 2) | 1
       if (refCounter == 1) ...
```

Etapy:
1. Dodaj flagę we wszystkich objektach (można interpretować ją jako "possibly not rooted" albo REF_CHAGED_FLAG)
   Jeżeli flaga się usunie w między czasie, to znaczy, że objekt jest rooted.
2. Odwiedź wszystkie objekty i zlicz referencje wewnętrzne.
   Po tym etapie objekty rooted: mają rożnicę referencji != 0 lub mają usuniętą flagę.
   Możliwa jest róźnica referencji < 0, gdy referencje się zmieniają wielokrotnie, ale to też jest ok.
3. Ustaw flagę "pending" i "not_new". W dalszych etapach objekty bez flagi "not_new", to nowe objekty, które nie uczestniczą w GC.
   Jeżeli GC Generational jest włączony, zamiast flagi "not_new" można objekty przsunąć do tymczasowej generacji, na której
   będziemy dalej operować.
5. Przejdź po liście objektów, jeżeli objekt jest rooted i "pending" przejdż po liście referencji wgłąb i oznaczaj objekty z
   referencji jako rooted. Usuwaj "pending", po odpytaniu o wszystkie kolejne referencje. Jeżeli braknie miejsca na stosie
   służącym do wchodzenia wgłąb drzewa, to można pominąć dodawanie, ale ważne, żeby objekt był ustawiony jako "rooted" i
   "pending". Przeleć po wszystkich objektach tak dużo razy, aż nie będzie już objektów "rooted" and "pending" and "not_new".
6. Użycie słabej referencji w czasie etapu 5 powoduje oznaczenie objektu jako "rooted" i "pending" (jeżeli nie był "rooted") i
   ustawienie jakiejś globalnej flagi (jeżeli potrzeba), że dodano nowy objekt "rooted" i "pending". Dzięki temu GC będzie
   wiedział, że isnieje objekt "rooted" i "pending", który jeszcze trzeba przetworzyć.
7. Po etapie 5 i przed zakończeniem GC, słabe referencje wskazujące na objekty uczesniczące w tym GC i nie "rooter" będą
   zwracać null.
8. Usuń objekty które są oznaczone jako: "not_new" and not "rooted"

(optymalizacja) Jeżeli w etapie 3 wyczyścimy "possibly not rooted" we wszystkich objektach, gdzie roźnica referencji != 0, to
można użyć drugiego licznika jako wskaźnika w liście. Lista może być użyta zamiast stosu w kroku 4.

Słabe referencje (opcja 1):
* Możliwe wyłączanie, żeby zaoszczędzić pamięć.
* Gdy objekt jest deallokowany, czyści zawartość WeakRefHolder
```
WeakRef ==========+     +============+
                  ⇓     ⇓            |
WeakRef =====> WeakRefHolder - - -> Object
                  ⇑
WeakRef ==========+

=====> - Strogn reference
- - -> - Weak reference
```

Słabe referencje (opcja 2):
* Słaba referencja wskazuje słabo na objekt (nie powoduje zwiększenia licznika referencji i GC nie wedruje po tej referencji)
* Objekt zawiera licznik słabych referencji
* Jeżeli objekt jest deallokowany i ma licznik słabych referencji > 0, to tak na prawdę jest przekształcany na
  objekt EmptyWeakRefHolder z licznikiem referencji równym licznikowi słabych referencji z poprzedniego objektu.
* Jeżeli słaba referencja wskazuje na EmptyWeakRefHolder, to jest to traktowane jako mocna referencja.
* Jeżeli użytkownik wyciągnie wartość słabej referencji wskazującej na EmptyWeakRefHolder, referencja na EmptyWeakRefHolder
  zostanie wyczyszczona, żeby umożliwić deallokację EmptyWeakRefHolder w przyszłości.

Opcja 1: mniej kodu
Opcja 2: mniej pamięci

# Classic GC

Zalety:
* Mniej kodu przez usunięcie increment i decrement
* Prawdopodobnie mniej pamięci przez usunięcie ref counter z ObjectHead
* Prawdopodobnie prostrzy GC

Wady:
* Potrzeba dodatkowych flag dla każdego obiektu (np. w nowej tablicy), np.
* Pamięć będzie się szybciej zapychać
* GC będzie musiał częściej działać
* Używane referencje trzeba przetrzymywać na jakiś listach "rooted" obiektów

Design:
* Dodatkowe flagi dla każdego objektu:
  * ALLOCATED - this slot is allocated
  * ROOTED - this object is rooted, ignored if ALLOCATED is not set
  * PENDING - this object need to be traveled (e.g. owner changed), ignored if ROOTED is not set
  * CONTAINER - this object is a container that can hold references to other objects (set once when object is allocated)
  * DYNAMIC - first entry in object head is pointer to table of methods (including traversal method)
  * VALUES_ONLY - all entries in object head are simple values (e.g. micro scope)
  * ALLOCATED, ROOTED i PENDING są zawsze ustawiane przy allokacji
  * ROOTED może zostać zastąpiony kilkoma bitami przy generacyjnym GC
* Root dla GC, to lista
  * dwukierunkowa dla referencji dynamicznie dodawanych/usuwanych,
  * jednokierunkowa dla referencji na stosie,
  * zawiera stos globalny na stałe
 
Algorytm GC (non-incremental):
* Przygotuj stos objektów do sprawdzenia używając największego wolnego bloku na stercie
* Usuń wszystkie flagi ROOTED
* Dla każdego objektu listy rooted:
  * Przejdź przez drzewo referencji ustawiając flagę ROOTED, używając stosu
  * Jeżeli stos się przepełnił, ustaw flagę PENDING dla objektów, które się nie zmieściły i ustaw globalną flagę PENDING_STACK_OVERFLOW
* Gdy globalna flaga PENDING_STACK_OVERFLOW:
  * Wyczyść PENDING_STACK_OVERFLOW
  * Dla każdego objektu na stercie, który ma flagę PENDING, rób to samo co dla każdego objektu listy rooted:
* Usuń wszystkie objekty bez flagi ROOTED

Algorytm incremental GC - taki jak non-incrementa tylko że:
* jest poszatkowany,
* stos objektów do sprawdzenia jest statyczny,
* zminana właściciela objektu (takrze dodanie nowego właściciela) powoduje ustawienie PENDING
* nie ma PENDING_STACK_OVERFLOW, tylko algorytm kończy, gdy nie ma już więcej PENDING
