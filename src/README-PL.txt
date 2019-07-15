

USBaspX jest programatorem dla mikrokontroler�w Atmel AVR. Komunikacja z
komputerem odbywa si� przez port USB. Zosta� wykonany na bazie programatora
USBasp (http://www.fischl.de/usbasp/). Posiada jednak wi�cej mo�liwo�ci.

Cechy, kt�re zosta�y przej�te z USBasp:
 - Port USB w ca�o�ci zrealizowany w oprogramowaniu.
 - Prosty uk�ad elektroniczny. Tylko mikrokontroler AVR i kilka pasywnych
   element�w.
 - Wieloplatformowy - Dzia�a na systemach Linux, Mac OS, Windows.
 - Udost�pnia dwie pr�dko�ci SPI.

Nowe cechy:
 - Umo�liwia programowanie na dw�ch poziomach napi��: 3.3V i 5V.
 - Interface szeregowy (UART) umo�liwiaj�cy np. debugowanie.
 - Tryb pracy, w kt�rym system rozpoznaje urz�dzenie jako port
   komunikacyjny (COM).


LICENCJA

Niniejszy program jest wolnym oprogramowaniem; mo�esz go rozprowadza� dalej
i/lub modyfikowa� na warunkach Powszechnej Licencji Publicznej GNU. Niniejszy
program rozpowszechniany jest z nadziej�, i� b�dzie on u�yteczny - jednak BEZ
JAKIEJKOLWIEK GWARANCJI, nawet domy�lnej gwarancji PRZYDATNO�CI HANDLOWEJ albo
PRZYDATNO�CI DO OKRE�LONYCH ZASTOSOWA�. W celu uzyskania bli�szych informacji
si�gnij do Powszechnej Licencji Publicznej GNU.


OGRANICZENIA

Tryb CDC (port komunikacyjny) zaimplementowany w tym urz�dzeniu, z przyczyn
technicznych, nie jest zgodny ze specyfikacj� USB, dlatego mog� wyst�pi�
problemy z wykryciem urz�dzenia USB w niekt�rych systemach linux.

Drugim problmem jest przepustowo�� przy ci�g�ym strumieniu danych. Jest ona
ograniczona wydajno�ci� komputera i przy pr�dko�ci ponad 19200bps mog�
zosta� zgubione nikt�re bajty przes�ane z urz�dzenia do PC. Je�eli komunikacja
nie jest ci�g�a i polega na wymianie pakiet�w mniejszych ni� 256 bajt�w, to
ten problem nie wyst�puje i pr�dko�� mo�e by� dowolna.


U�YTKOWANIE

Sterowniki dla systemu Windows znajduj� si� w katalogu "driver".
W programatorze znajduj� si� cztery zworki lub prze��czniki:
 - ST (Supply Target) � w��cza napi�cie na porcie ISP.
 - 5V (5 Volts) � w��cza tryb 5V, gdy wy��czone programator dzia�a na
   napi�ciu 3.3V
 - CM (Communication Mode) � je�eli w��czone, urz�dzenie dzia�a jako port
   komunikacyjny w systemie, dane przesy�ane s� przez UART. W przeciwnym
   wypadku dzia�a w trybie kompatybilno�ci z USBasp. Zmian� pr�dko�ci SCK
   wykonuje si� przez kr�tkie (mniej ni� 2 sek.) w��czenie i wy��czenie tego
   prze��cznika. W odpowiedzi programator zamruga diod� szybko � szybki zegar,
   lub powoli � wolny zegar.
 - SP (Self Programming) � Gdy w��czone, umo�liwia za�adowanie oprogramowania
   za pomoc� innego programatora.

Przy zastosowaniu zalecanego schematu prze��czniki maj� nastepuj�c� kolejno��:
  ST - SW1
  5V - SW2
  SP - SW3
  CM - SW4

Przy zastosowaniu p�ytki z USBasp:
  ST - bez zmian
  5V - brak, sprz�towo w��czone na sta�e
  SP - bez zmian
  CM - zast�puje "Slow SCK"


INSTALACJA

Aby za�adowa� firmware do programatora lub go zaktualizowa� nale�y:
1. W��czy� prze��cznik SP (Self Programming).
2. Pod��czy� inny programator przez port ISP do programowanego uk�adu.
3. Pod��czy� zasilanie. Mo�e to by� zrobione na jeden z duch sposob�w:
   a) przez port USB, gdy prze��cznik ST (Supply Target) jest
      wy��czony,
   b) przez port ISP, gdy prze��cznik ST (Supply Target) jest
      w��czony i 5V (5 Volts) jest w��czony.
4. W zale�no�ci od procesora zmieni� fusebity:
   a) ATmega88: Fuse Low = 0xF7, Fuse High = 0xDD
   b) ATmega8:  Fuse Low = 0xBF, Fuse High = 0xC9
5. Za�adowa� odpowieni plik:
   a) zalecana p�ytka USBaspX z ATmega88: firmware-x.x-mega88.hex
   a) zalecana p�ytka USBaspX z ATmega8: firmware-x.x-mega8.hex
   a) p�ytka USBasp z ATmega8: firmware-x.x-USBasp-mega8.hex


BUDOWANIE �R�DE�

Aby skompilowa� oprogramowanie nale�y:
1. Pobra� i zainstalowa� narz�dzia GNU dla mikrokontroler�w AVR (avr-gcc,
   avr-libc oraz narz�dzie make). Wszystko co potrzebne dla systemu Windows
   znajduje si� w pakiecie WinAVR (http://winavr.sourceforge.net/).
2. Je�eli kompilacja jest dla ATmega8, to w pliku "Makefile_inc",
   zmieni� VS_MCU na odpowiedni.
2. W wierszu polece� przej�� do katalogu zawieraj�cego USBaspX.
3. Uruchomi� "make"
4. W pliku "firmware.hex" znajduje si� gotowy program.

Aby automatycznie po budowaniu za�adowa� firmware do programatora, nale�y:
1. Zmieni� zmienne VS_AVRDUDE_PROGRAMMER i VS_AVRDUDE_PORT w pliku 
   "Makefile_inc" tak, aby pasowa�y do twojego programatora.
2. Pod��czy� programator jak w pukcie "INSTALACJA"
3. Dla ATmega88 uruchomi� "make fuse", dla ATmega8 ustawi� fusebity r�cznie.
4. Uruchomi� "make program".

