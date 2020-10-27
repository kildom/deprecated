# Opis działania

## Produkcja

### Pilot
* Pilot podczas produkcji jest programowany wraz unikalnym numerem seryjnym SN dla każdego kanału.
* Pilot na końcu produkcji jest uruchamiany i zegar czasu rzeczywistego rozpoczyna odliczanie czasu T.
* Pierwsze uruchomienie generuje unikalną parę kluczy (krzywa [Curve25519](https://en.wikipedia.org/wiki/Curve25519)):
  * Klucz prywatny `RSK`, ktróry jest generowany w pilocie i nigdy go nie opuszcza.
  * Klucz publiczny `RPK`, który będzie później udostępniony centralce podczas procesu parowania.
  
### Centralka
* Centralka na końcu produkcji jest uruchamiana.
* Centralka uruchomienie generuje unikalną parę kluczy (krzywa [Curve25519](https://en.wikipedia.org/wiki/Curve25519)):
  * Klucz prywatny `CSK`, ktróry jest generowany w centralce i nigdy go nie opuszcza.
  * Klucz publiczny `CPK`, który będzie później udostępniony pilotom podczas procesu parowania.

### Parowanie
* Parowanie pilota i centralki rozpoczyna się po długim wciśnięciu przycisku. LED informuje o rozpoczęciu procesu parowania.
* Centralka nadaje przez LED `CPK` i losowy ciąg danych `CR`.
* Pilot po odebraniu przez czujnik światła danych z centralki:
  * oblicza wspólny klucz szyfrowania `SK = KDF(X25519(CPK, RSK))`,
  * generuje losowy ciąg danych `RR`,
  * szyfruje ciąg `RH = AES(SK, {CR RR SN})`,
  * rozpoczyna nadawanie `RPK` i `RH` przez LED
* Centralka po odebraniu poprawnego `RH`:
  * oblicza wspólny klucz szyfrowania `SK = KDF(X25519(RPK, CSK))`
  * przydzila pilotowy numer `S`
  * szyfruje ciąg `CH = AES(SK, {RR S})`
  * rozpoczyna nadawanie `CH` przez LED
* Pilot po odebraniu poprawnego `CH`
  * zapisuje dane parowania: `memory = SK`
  * szyfruje ciąg `P = AES(SK, {SN T})`
  * nadaje przez radio ciąg `S P` przez kilka sekund
  * kończy proces parowania
* Centralka po odebraniu poprawnego `P`
  * zapisuje dane parowania: `memory[S] = { SK, T, SN }`
  * kończy proces parowania

### Rozparowanie
* Usunięcie numeru pilota z centralki ręcznie (np. kiedy pilot się zepsuł)
* Usunięcie przez zbliżenie:
  * Centrakla jest w stanie rozparowania
  * Pilot jest w stanie parowania
  * Proces przebiega jak parowanie, z wyjątkiem tego, że centralka zamiast zapisywać czyści dane parowania

### Otwieranie
* Pilot po wciśnięciu lub puszczeniu przycisku
  * dodaje zdarzenie do kolejki `Q`
  * szyfruje ciąg `P = AES(SK, {SN T Q})`
  * nadaje przez radio ciąg `S P` przez jakiś czas
* Centralka po odebraniu danych
  * Odczytuje z pamięci `memory[S]` dane parowania
  * Odszyfrowuje dane i sprawdza poprawność `SN` i `T +-5sek.`
  * Zapisuje nowe `T` jeżeli się różni.
  * Wykonuje nowe zdarzenia z kolejki `Q`

### Kolejka zdarzeń
* Numer zdarzenia: 6 bitów 
  * najmłodszy mówi czy to jest wciśnięcie, czy zwolnienie
* Czasy od poprzednich zdarzeń: 6 czsów x 3 bity
  * Wartość 0 - koniec kolejki
  * Skala nieliniowa, np. 1: `0.2s`, N: `0.2*(3/0.2)^((N-1)/6)`, 7: `3s`

