# Opis działania

## Produkcja

### Pilot
* Pilot podczas produkcji jest programowany wraz unikalnym numerem seryjnym SN dla każdego kanału.
* Pilot na końcu produkcji jest uruchamiany i zegar czasu rzeczywistego rozpoczyna odliczanie czasu T (krok co 2 sek.).
* Pierwsze uruchomienie generuje unikalną parę kluczy (krzywa [Curve25519](https://en.wikipedia.org/wiki/Curve25519)):
  * Klucz prywatny `RSK`, ktróry jest generowany w pilocie i nigdy go nie opuszcza.
  * Klucz publiczny `RPK`, który będzie później udostępniony centralce podczas procesu parowania.
  
### Centralka
* Centralka na końcu produkcji jest uruchamiana.
* Centralka uruchomienie generuje unikalną parę kluczy (krzywa [Curve25519](https://en.wikipedia.org/wiki/Curve25519)):
  * Klucz prywatny `CSK`, ktróry jest generowany w centralce i nigdy go nie opuszcza.
  * Klucz publiczny `CPK`, który będzie później udostępniony pilotom podczas procesu parowania.

## Parowanie przy pomocy ECC (bezpieczniejsze)

> ### *Prostrza metoda (dla pilota) jest w pairing.drawio*

* Parowanie pilota i centralki rozpoczyna się po długim wciśnięciu przycisku. LED informuje o rozpoczęciu procesu parowania.
* Centralka nadaje przez LED `CPK` i losowy ciąg danych `CR`.
* Pilot po odebraniu przez czujnik światła danych z centralki:
  * oblicza wspólny klucz szyfrowania `SK = KDF(X25519(CPK, RSK), CR)`,
  * generuje losowy ciąg danych `RR`,
  * szyfruje ciąg `RH = AES(SK, {CR RR SN})`,
  * rozpoczyna nadawanie `RPK` i `RH` przez LED
* Centralka po odebraniu poprawnego `RH`:
  * oblicza wspólny klucz szyfrowania `SK = KDF(X25519(RPK, CSK), CR)`
  * przydzila pilotowy numer `S`
  * szyfruje ciąg `CH = AES(SK, {RR S})`
  * rozpoczyna nadawanie `CH` przez LED
* Pilot po odebraniu poprawnego `CH`
  * zapisuje dane parowania: `memory = {S SK}`
  * szyfruje ciąg `P = AES(SK, {SN T})`
  * nadaje przez radio ciąg `S P` przez kilka sekund
  * kończy proces parowania
* Centralka po odebraniu poprawnego `P`
  * zapisuje dane parowania: `memory[S] = { SK, T, SN }`
  * kończy proces parowania

## Rozparowanie
* Usunięcie numeru pilota z centralki ręcznie (np. kiedy pilot się zepsuł)
* Usunięcie przez zbliżenie:
  * Centrakla jest w stanie rozparowania
  * Pilot jest w stanie parowania
  * Proces przebiega jak parowanie, z wyjątkiem tego, że centralka zamiast zapisywać czyści dane parowania i nie czeka na `P`.

## Otwieranie
* Pilot po wciśnięciu lub puszczeniu przycisku
  * dodaje zdarzenie do kolejki `Q`
  * szyfruje ciąg `P = AES(SK, {SN T Q})`
  * nadaje przez radio ciąg `S P` przez jakiś czas
* Centralka po odebraniu danych
  * Odczytuje z pamięci `memory[S]` dane parowania
  * Odszyfrowuje dane i sprawdza poprawność `SN` i `T` dopuszczając pewien błąd w częstotliwości kwarców, kwantyzacji czasu (2sek.) i czasu transmisji/obsługi pakietu.
  * Zapisuje nowe `T` jeżeli się różni na poziomie błędu w częstotliwości kwarców.
  * Wykonuje nowe zdarzenia z kolejki `Q`

### Kolejka zdarzeń
* Numer zdarzenia: 6 bitów 
  * najmłodszy mówi czy to jest wciśnięcie, czy zwolnienie
* Czasy od poprzednich zdarzeń: 6 czsów x 3 bity
  * Wartość 0 - koniec kolejki
  * Skala nieliniowa, np. 1: `0.2s`, N: `0.2*(3/0.2)^((N-1)/6)`, 7: `3s`

## Utrata zasilania
* Prez pilot:
  * Powinna być unikana na poziomie elektronicznym, np. przez dodanie kondensatora/baterii podtrzymującej tylko RTC.
  * Konieczne jest:
    * ponowne parowanie z centralką
    * lub tylko zliżenie do centralki, bo centralka nadaje przez przez LED aktualny czas zaszyfrowany kluczem z ostatnio wciśniętego pilota
      (albo tylko wystkich pilotów w pętli).
* Przez centralkę:
  * Powinna być unikana na poziomie elektronicznym, np. przez dodanie mocnej baterii podtrzymującej tylko RTC.
  * Konieczne jest:
    * ponowne parowanie ze wszystkimi pilotami
    * lub wybranie opcji synchronizacji zegara na podstawie czasu pilota.
      Centralka zignoruje błąd czasu z pilota i zapisze nowy czas jako swój aktualny.
      Wystarczy synchronizacja z jednym pilotem, a wszystkie inne powinny zacząć znowu działać.

# Transfer LED
* LED w pilocie jest jednocześnie nadajnikiem i odbiornikiem (wykożystuje mały prąd generowany przez LED, gdy jest oświetlone)
* W centralce jest oddzielnie obiornik (np. fototranzystor) i mocna LED jako nadajnik, żeby nadrobić słaby sprzęt pilota
* Od strony pilota odbiór jest uproszczony, bo:
  * On jest kontrolerem: wysyła pakiet i oczekuje odpowiedzi.
  * Odpowiedź z centralki przychodzi w dokładnie określonym momencie (co do ułamka bitu), żeby pilot nie musiał wykonywać algorytmu synchronizacji.
  * Długość bitu z centralki do pilota jest 3x większa, żeby zwiększyć dokładność synchronizacji i poprawić jakość sygnału
* Od strony centralki odbiór jest bardziej skomplikowany, bo wymaga na początku algorytmu synchronizacji

## Format transferu (z pilota do centralki)
* Częstotliwość: F = 6kHz (albo coś takiego)
* Kodowanie:
  * poziom 0: sygnał 0 → LED off, 1 → LED on
  * poziom 1: bit 0 → sygnał `01010101`, bit 1 → sygnał `10101010` (jak Manchester, tylko, że każdy bit jest powtórzony 4x)
  * poziom 2: bajt → 8 x bit
  * posiom 3: pakiet → losowa prelabuła (4 bytes), dane, crc-16
* **Algorytm synchronizacji**. Centralka odbiera 3 sample z ADC na jeden bit i co trzeci bit przesyła sampla na oddzielną ścieżkę przetwarzania:
  * póbka wchodzi na 8 elementowe sliding window, dekodujące jeden bit:
    * Okno składa się z bufora cyklicznego i jednego bajtu przesównego
    * Gdy próbka wchodzi do bufora:
      * to jest prównywana z poprzednią (opertor `<=`) i wynik porównania (0 lub 1) jest wsuwany do bajta
      * ostatnia próbka (po przesunięci bofora) jest prównywana z pierwszą i wynik wpisywany jest do najstarszego bita bajta przesównego
    * w wyniku bajt przesówny ma wartość, np. `01010101`, i patrząc do lookup table to jest bit 1
    * lookup table jest rozmiaru 256/8=64 bajty, bo zawiera jeden bit na element,
    * lookup table przekształca ciąg zmian sygnału na najbardziej prawdopodobny bit, należy przy tym pamiętać,
      że najstarszy bit jest mniej znaczący od innych bo reprezentuje zmianę bardziej od siebie oddalonych sygnałów.
      np. `11111111` jest traktowany jak zniekształcony `01010101` (3 różnice znaczące + 1 mniej znacząca), a nie 10101010 (4 różnice znaczące)
  * ze sliding window wychodzi 1 bit po każdym samplu, jest on wsuwany do jednego z 8 buforów detektujących patern (cyklicznie kolejny bufor przy każdej próbce).
    * patern zawiera większą cześć z początku prelambuły, nie zawiera końca, który jest traktowany jako element naruszający pattern,
      jeżeli zostaje wsunięty, dlatego końcówka prelambuły powinna być tak skonstrułowana, żeby szybko invalidowała pattern.
    * jeżeli bofor zawiera spodziewany pattern, `1` jest wsuwane do jednego z 2 4-bitowych rejestrów przesównych
      (nieparzyste bufory detektujące mają jeden rejestr, a parzyste drugi). jeżeli nie, to `0` jest wsuwane.
    * jeżeli najstarszy bit rejestru przesównego jest `1`, lookup table jest użyta, żeby określić najbardziej prawdopodobny początek danych
      (dokładną synchronizację), np. rejestr ma `1110` to oznacza, że dokładny koniec paternu był 2 bity rejestru przesównego temu (1 **1** 10).
      Na tej podstawie należy dokładnie wyliczyć, gdzie zaczynają się dane.
  * jeżeli początek danych został wyliczony, przechodzimy do odbierania danych
  * jest też wyliczany dokładny czas rozpoczęcia transmisji z centralki do pilota.
* **Odbieranie danych**
  * Porównania próbek wchodzą do bajta jak to było w sliding window, tylko teraz wyjściowy bit jest wyciągany jak cały bajt się wypełni (co 8 próbek).
    Ten sam lookup table jest wykożystany.
  * Kolejne bity formują pakiet
  * Na koniec crc-16 jest liczone i jeżeli nie jest ok, pakiet jest ignorowany.

## Format transferu (z centralki do pilota)
* Częstotliwość: F/3 = 2kHz (albo coś takiego)
* Kodowanie:
  * poziom 0: sygnał 0 → LED off, 1 → LED on
  * poziom 1: bit 0 → sygnał `01010101`, bit 1 → sygnał `10101010` (jak Manchester, tylko, że każdy bit jest powtórzony 4x)
  * poziom 2: bajt → 8 x bit
  * posiom 3: pakiet → dane, crc-16
* **Odbieranie danych**
  * Odbieranie danych rozpoczyna się w ściśle określonym momencie w stosunku do początku prelambuły, tak aby samplowanie ADC wypadło dokładnie w połowie sygnału.
  * Reszta odbierania danych wygląda jak z pilota do centralki, tylko nie ma algorytm synchronizacji, prelambuły i rozdzielania próbek na 3 ścieżki.

# Parowanie bez ECC

*Haker musi przechwycić całą transmisję LED, żeby posiadać klucz*

Pilot i centralka wymieniają się losowymi 8-bajtowymi ciągami N razy. Klucz jest hashem tych ciągów.
Numer pakietu jest konieczny do identyfikacji, czy doszło.
Retransmisja powinna posiadać nowy losowy ciąg, z wyjątkiem ostatniego pakietu.
Pilot jest kontrolerem tej transmisji.

Jezeli sprzęt na to pozwala, pilot może próbować nadawać ze słabszą mocą, żeby utrudnić przechwycenie klucza.
Jak się nie uda, zwiększać moc.

Jeżeli klucz okazał się niepoprawny, cała procedura powinna zostać powtórzona.

Przykład:
```
Pilot     Centralka
(request) (response)
0,X     -->
        <--  0,U
1,Z     --x
1,B     -->
        <--  1,T
2,Q     -->
        x--  2,D
2,S     -->
        <--  2,W
...
9,C     -->
        x--  9,L
             shared key is
             HASH("XUTBSW...CL")
9,C     -->
        <--  9,L
             shared key is
             already computed
shared key is
HASH("XUTBSW...CL")
...
kontunuj parowanie używając "shared key":
  wymień się SN (serial number) i ID (index of the remote)
  wymień sie jakimiś innymi danymi, potwiedzającymi, że wszystko jest ok.
  wyślij akcję z pilota w celu synchronizacji czasu
  i zatwierdzenia parowania po stronie centralki.
```
