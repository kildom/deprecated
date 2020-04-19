
/*------------------------------ Connections ------------------------------*/

inline void sub()
{

    piec.step(zawor.YTwyj,   // => UTpowr
              ster.YTdodana, // => UTmoc
              T);

    czujnik.step(zawor.YTwyj, // => UTwej
                 T);

    zawor.step(sprz.YTzimn, // => UTsprz
               silownik.y,  // => Usil
               piec.YTwyj,  // => UTpiec
               T);

    sprz.step(silownik.y, // => Usil
              zasob.y,    // => UTzas
              in.pomp,    // => Upomp
              piec.YTwyj, // => UTpiec
              T);

    silownik.step(in.silownik, // => U
                  T);

    zasob.step(sprz.YTciepl, // => UTsprz
               in.pomp,      // => pomp
               in.odplyw,    // => Uodp
               T);

    ster.step(piec.YTwyj, // => UTpiec
              zasob.y,    // => UTzas
              T);

    out.temp = czujnik.y;
    out.cwu = ster.Ycwu;
}

/*------------------------------ Piec ------------------------------*/

struct Piec : public Sub
{
    num YTwyj;
    Inercja iner;
    inline void step(num UTpowr, num UTmoc, num T)
    {
        YTwyj = iner(UTpowr + UTmoc);
    }
} piec;

/*------------------------------ Czujnik ------------------------------*/

struct Czujnik : public Sub
{
    num y;
    Inercja iner;
    inline void step(num UTwej, num T)
    {
        y = iner(UTwej);
    }
} czujnik;

/*------------------------------ Zawor ------------------------------*/

struct Zawor : public Sub
{
    num YTwyj;
    inline void step(num UTsprz, num Usil, num UTpiec, num T)
    {
        YTwyj = Usil * UTsprz + (1 - Usil) * UTpiec;
    }
} zawor;

/*------------------------------ Sprz ------------------------------*/

struct Sprz : public Sub
{
    num K, YTciepl, YTzimn;
    inline void step(num Usil, num UTzas, num Upomp, num UTpiec, num T)
    {
        num Cin = Usil;
        num Zout = -Usil;
        num Cout = -K * Upomp;
        num Zin = K * Upomp;
        num Cbilans = Cin + Cout;
        num Zbilans = Zin + Zout;
        num d = Cbilans - Zbilans;
        if (std::fabs(d) < 0.0001)
        {
            YTciepl = UTpiec;
            YTzimn = UTzas;
        }
        else if (d > 0)
        {
            YTciepl = UTpiec;
            num w = d / (d + Zin);
            YTzimn = UTpiec * w + UTzas * (1 - w);
        }
        else
        {
            YTzimn = UTzas;
            num w = d / (d - Cin);
            YTciepl = UTzas * w + UTpiec * (1 - w);
        };
    }
} sprz;

/*------------------------------ Silownik ------------------------------*/

struct Silownik : public Sub
{
    num y, Ksil;
    inline void step(num U, num T)
    {
        num y_p = Ksil * U;
        y += y_p * dt;
        y = range(y, 0, 1);
    }
} silownik;

/*------------------------------ Zasob ------------------------------*/

struct Zasob : public Sub
{
    num x, Kgrz, Kodplyw, Twod, y, Kwymm;
    inline void step(num UTsprz, num pomp, num Uodp, num T)
    {
        num x_p = Kgrz * (UTsprz - x) * pomp + Kodplyw * Uodp * (Twod - x);
        x += x_p * dt;
        y = Kwymm * x + (1 - Kwymm) * UTsprz;
    }
} zasob;

/*------------------------------ Ster ------------------------------*/

struct Ster : public Sub
{
    num Tzasmin, Tzasmax, YTdodana, KPster, Tpieczadana, Ycwu;
    Histereza hister;
    inline void step(num UTpiec, num UTzas, num T)
    {
        if (hister(UTzas, Tzasmin, Tzasmax) < 0)
        {
            YTdodana = KPster * (Tpieczadana - UTpiec);
            YTdodana = range(YTdodana, 3, 10);
            Ycwu = 1;
        }
        else
        {
            YTdodana = 0;
            Ycwu = 0;
        };
    }
} ster;

/*------------------------------ In ------------------------------*/

struct In : public Sub
{
    num silownik, pomp, odplyw;
} in;

/*------------------------------ Out ------------------------------*/

struct Out : public Sub
{
    num temp, cwu;
} out;
