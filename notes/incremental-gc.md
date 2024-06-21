

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

Słabe referencje:
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
