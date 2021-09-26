
#include <string>

#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))

typedef float liczba;

class Piec {
public:
    liczba przeplyw;
    liczba tempWejscia;
    liczba tempWyjscia;
};

class Zasobnik {
public:
    liczba przeplyw;
    liczba tempWejscia;
    liczba tempWyjscia;
};

class Podlogowka {
public:
    std::string nazwa;
    liczba wylewka[5];
    liczba rura[5];
    liczba przeplyw;
    liczba tempWejscia;
    liczba tempWyjscia;
    liczba oddawaniePodlogowki;
    liczba wspWylewkaPodlogowka;
    liczba oddawanieWylewki;
    liczba wspPowietrzeWylewka;
    liczba *oddawaniePowietrza;
    liczba tempPowietrza;
    liczba tempZewnetrzna;
    liczba wspKroku;
    liczba przeplynelo;
    Podlogowka(const std::string &nazwa) : nazwa(nazwa) {
        oddawaniePodlogowki = parametry.get("oddawanie-podlogowki", 1, "zmiana °C / różnicę °C / sek");
        wspWylewkaPodlogowka = parametry.get("wsp-wylewka-podlogowka", 0.01, "zmiana °C wylewki / zmiana °C podłogówki");
        oddawanieWylewki = parametry.get("pobieranie-wylewki", 0.1, "zmiana °C / różnicę °C / sek");
        wspPowietrzeWylewka = parametry.get("wsp-powietrze-wylewka", 1, "zmiana °C powietrza / zmiana °C wylewki");
        tempPowietrza = parametry.get("temp-poczatkowa-powietrza", 23, "°C");
        tempZewnetrzna = parametry.get("temp-zewnetrzna", -5, "°C");
        liczba f = parametry.get("temp-poczatkowa-podlogowki", 20, "°C");
        for (int i = 0; i < ARRAY_SIZE(rura); i++) {
            rura[i] = f;
            wylewka[i] = f;
        }
        przeplyw = 0;
        tempWyjscia = f;
        tempWejscia = f;
        czujniki.set(nazwa + "-wyjscie", &tempWyjscia);
        czujniki.set(nazwa + "-wejscie", &tempWejscia);
        czujniki.set(nazwa + "-powietrze", &tempPowietrza);
        wejscia.get("oddawanie-powietrza", &oddawaniePowietrza, "zmiana °C / różnicę °C / sek");
        liczba czas = parametry.get("czas-przeplywu-przez-podlogowke", 60);
        wspKroku = 1.0 / (czas / ARRAY_SIZE(rura));
        przeplynelo = 0;
    }
    void przelicz(liczba czas, liczba krok)
    {
        przeplynelo += krok * przeplyw * wspKroku;
        if (przeplynelo >= 1.0) {
            memmove(&rura[0], &rura[1], sizeof(rura) - sizeof(rura[0]));
            rura[ARRAY_SIZE(rura) - 1] = tempWejscia;
            przeplynelo -= 1.0;
        }
        
        for (int i = 0; i < ARRAY_SIZE(rura); i++) {
            liczba roznica = oddawaniePodlogowki * (rura[i] - wylewka[i]) * krok;
            rura[i] -= roznica;
            wylewka[i] += roznica * wspWylewkaPodlogowka;
            roznica = oddawanieWylewki * (wylewka[i] - tempPowietrza) * krok;
            wylewka[i] -= roznica;
            tempPowietrza += roznica * wspPowietrzeWylewka / ARRAY_SIZE(rura);
        }
        tempPowietrza -= *oddawaniePowietrza * (tempPowietrza - tempZewnetrzna) * krok;
        tempWyjscia = rura[0] * (1.0 - przeplynelo) + rura[1] * przeplynelo;
    }
};

class Zawor {
public:
    operator liczba();
};

class Pompa {
public:
    operator liczba();
};


class Rury
{
    Piec piec;
    Zasobnik zasobnik;
    Podlogowka gora;
    Podlogowka dol;
    Zawor Z0, Z1, Z2;
    Pompa P0, P1, P2, P3;

    void przelicz(liczba czas, liczba krok)
    {
        //piec.przelicz();
        dol.przelicz(czas, krok);
        gora.przelicz(czas, krok);
        //zasobnik.przelicz();
        liczba Tpiec = piec.tempWyjscia;
        liczba Twyj1 = dol.tempWyjscia;
        liczba Twyj2 = gora.tempWyjscia;
        liczba Twyj3 = zasobnik.tempWyjscia;

        liczba Twejspz = (P1 * Z1 * Twyj1 + P2 * Z2 * Twyj2 + P3 * Twyj3)
                         / (P1 * Z1 + P2 * Z2 + P3);
        liczba Pp = Z0 * P0;
        liczba Ps = Z1 * P1 + Z2 * P2 + P3;

        liczba Tspc, Tspz;

        if (Pp > Ps) {
            Tspc = Tpiec;
            Tspz = ((Pp - Ps) * Tpiec + Ps * Twejspz)
                   / ((Pp - Ps) + Ps);
        } else {
            Tspz = Twejspz;
            Tspc = ((Ps - Pp) * Twejspz + Pp * Tpiec)
                   / ((Ps - Pp) + Pp);
        }

        piec.tempWejscia = Z0 * Tspz + (1.0 - Z0) * Tpiec;
        dol.tempWejscia = Z1 * Tspc + (1.0 - Z1) * Twyj1;
        gora.tempWejscia = Z2 * Tspc + (1.0 - Z2) * Twyj2;
        zasobnik.tempWejscia = Tspc;

        piec.przeplyw = P0;
        dol.przeplyw = P1;
        gora.przeplyw = P2;
        zasobnik.przeplyw = P3;
    }
};
