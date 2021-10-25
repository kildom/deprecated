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
  wyślij akcję z pilota w celu synchronizacji czasu
  i zatwierdzenia parowania po stronie centralki.
```
