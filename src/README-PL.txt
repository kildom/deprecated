

USBaspX jest programatorem dla mikrokontrolerÛw Atmel AVR. Komunikacja z
komputerem odbywa siÍ przez port USB. Zosta≥ wykonany na bazie programatora
USBasp (http://www.fischl.de/usbasp/). Posiada jednak wiÍcej moøliwoúci.

Cechy, ktÛre zosta≥y przejÍte z USBasp:
 - Port USB w ca≥oúci zrealizowany w oprogramowaniu.
 - Prosty uk≥ad elektroniczny. Tylko mikrokontroler AVR i kilka pasywnych
   elementÛw.
 - Wieloplatformowy - Dzia≥a na systemach Linux, Mac OS, Windows.
 - UdostÍpnia dwie prÍdkoúci SPI.

Nowe cechy:
 - Umoøliwia programowanie na dwÛch poziomach napiÍÊ: 3.3V i 5V.
 - Interface szeregowy (UART) umoøliwiajπcy np. debugowanie.
 - Tryb pracy, w ktÛrym system rozpoznaje urzπdzenie jako port
   komunikacyjny (COM).


LICENCJA

Niniejszy program jest wolnym oprogramowaniem; moøesz go rozprowadzaÊ dalej
i/lub modyfikowaÊ na warunkach Powszechnej Licencji Publicznej GNU. Niniejszy
program rozpowszechniany jest z nadziejπ, iø bÍdzie on uøyteczny - jednak BEZ
JAKIEJKOLWIEK GWARANCJI, nawet domyúlnej gwarancji PRZYDATNOåCI HANDLOWEJ albo
PRZYDATNOåCI DO OKREåLONYCH ZASTOSOWA—. W celu uzyskania bliøszych informacji
siÍgnij do Powszechnej Licencji Publicznej GNU.


OGRANICZENIA

Tryb CDC (port komunikacyjny) zaimplementowany w tym urzπdzeniu, z przyczyn
technicznych, nie jest zgodny ze specyfikacjπ USB, dlatego mogπ wystπpiÊ
problemy z wykryciem urzπdzenia USB w niektÛrych systemach linux.

Drugim problmem jest przepustowoúÊ przy ciπg≥ym strumieniu danych. Jest ona
ograniczona wydajnoúciπ komputera i przy prÍdkoúci ponad 19200bps mogπ
zostaÊ zgubione niktÛre bajty przes≥ane z urzπdzenia do PC. Jeøeli komunikacja
nie jest ciπg≥a i polega na wymianie pakietÛw mniejszych niø 256 bajtÛw, to
ten problem nie wystÍpuje i prÍdkoúÊ moøe byÊ dowolna.


UØYTKOWANIE

Sterowniki dla systemu Windows znajdujπ siÍ w katalogu "driver".
W programatorze znajdujπ siÍ cztery zworki lub prze≥πczniki:
 - ST (Supply Target) ñ w≥πcza napiÍcie na porcie ISP.
 - 5V (5 Volts) ñ w≥πcza tryb 5V, gdy wy≥πczone programator dzia≥a na
   napiÍciu 3.3V
 - CM (Communication Mode) ñ jeøeli w≥πczone, urzπdzenie dzia≥a jako port
   komunikacyjny w systemie, dane przesy≥ane sπ przez UART. W przeciwnym
   wypadku dzia≥a w trybie kompatybilnoúci z USBasp. ZmianÍ prÍdkoúci SCK
   wykonuje siÍ przez krÛtkie (mniej niø 2 sek.) w≥πczenie i wy≥πczenie tego
   prze≥πcznika. W odpowiedzi programator zamruga diodπ szybko ñ szybki zegar,
   lub powoli ñ wolny zegar.
 - SP (Self Programming) ñ Gdy w≥πczone, umoøliwia za≥adowanie oprogramowania
   za pomocπ innego programatora.

Przy zastosowaniu zalecanego schematu prze≥πczniki majπ nastepujπcπ kolejnoúÊ:
  ST - SW1
  5V - SW2
  SP - SW3
  CM - SW4

Przy zastosowaniu p≥ytki z USBasp:
  ST - bez zmian
  5V - brak, sprzÍtowo w≥πczone na sta≥e
  SP - bez zmian
  CM - zastÍpuje "Slow SCK"


INSTALACJA

Aby za≥adowaÊ firmware do programatora lub go zaktualizowaÊ naleøy:
1. W≥πczyÊ prze≥πcznik SP (Self Programming).
2. Pod≥πczyÊ inny programator przez port ISP do programowanego uk≥adu.
3. Pod≥πczyÊ zasilanie. Moøe to byÊ zrobione na jeden z duch sposobÛw:
   a) przez port USB, gdy prze≥πcznik ST (Supply Target) jest
      wy≥πczony,
   b) przez port ISP, gdy prze≥πcznik ST (Supply Target) jest
      w≥πczony i 5V (5 Volts) jest w≥πczony.
4. W zaleønoúci od procesora zmieniÊ fusebity:
   a) ATmega88: Fuse Low = 0xF7, Fuse High = 0xDD
   b) ATmega8:  Fuse Low = 0xBF, Fuse High = 0xC9
5. Za≥adowaÊ odpowieni plik:
   a) zalecana p≥ytka USBaspX z ATmega88: firmware-x.x-mega88.hex
   a) zalecana p≥ytka USBaspX z ATmega8: firmware-x.x-mega8.hex
   a) p≥ytka USBasp z ATmega8: firmware-x.x-USBasp-mega8.hex


BUDOWANIE èR”DE£

Aby skompilowaÊ oprogramowanie naleøy:
1. PobraÊ i zainstalowaÊ narzÍdzia GNU dla mikrokontrolerÛw AVR (avr-gcc,
   avr-libc oraz narzÍdzie make). Wszystko co potrzebne dla systemu Windows
   znajduje siÍ w pakiecie WinAVR (http://winavr.sourceforge.net/).
2. Jeøeli kompilacja jest dla ATmega8, to w pliku "Makefile_inc",
   zmieniÊ VS_MCU na odpowiedni.
2. W wierszu poleceÒ przejúÊ do katalogu zawierajπcego USBaspX.
3. UruchomiÊ "make"
4. W pliku "firmware.hex" znajduje siÍ gotowy program.

Aby automatycznie po budowaniu za≥adowaÊ firmware do programatora, naleøy:
1. ZmieniÊ zmienne VS_AVRDUDE_PROGRAMMER i VS_AVRDUDE_PORT w pliku 
   "Makefile_inc" tak, aby pasowa≥y do twojego programatora.
2. Pod≥πczyÊ programator jak w pukcie "INSTALACJA"
3. Dla ATmega88 uruchomiÊ "make fuse", dla ATmega8 ustawiÊ fusebity rÍcznie.
4. UruchomiÊ "make program".

