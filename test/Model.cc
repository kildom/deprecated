


#include <algorithm>
#include <iterator>
#include <string>
#include <math.h>
#include <string.h>

#define INT_SEP ";"
#define INT_DOT ','

#include "model.hh"

#define DT 0.1
#define TEMP_0 20.0

#define SEK(x) (x)
#define MIN(x) ((x) * 60.0)
#define GODZ(x) ((x) * 60.0 * 60.0)


Model::Model()
{
    time = 0;
    dt = DT;
    silownik.czasOtw = 60.0;
    silownik.poz = 1;
    zawor.Twyj = 20;
    input.sil = -1;
    piec.inerWyjscia.init(dt, MIN(5), MIN(5), TEMP_0);
    piec.inerCzujnika.init(dt, MIN(1), MIN(1), TEMP_0);
    piec.inerMocy.init(dt, MIN(20), MIN(15), 0);
    double* values[] = { &time, &input.sil, &silownik.poz, NULL };
    double deltas[] =  { 10,    0.1,        0.01,          };
    log.init(values, deltas);
    log.log(true);
}

int Model::steps(double toTime)
{
    int steps = (toTime - time) / dt;
    if (steps <= 0) return 0;
    this->steps(steps);
    return steps;
}

void Model::steps(int steps)
{
    while (steps--)
    {
        step();
    }
}


void Model::step()
{
    // zawor
    zawor.Twyj = silownik.poz;// * sprzeglo.Tciepla + (1.0 - silownik.poz * piec.Twyj)

    // silownik
    silownik.poz += diff(1.0 / silownik.czasOtw * input.sil);
    limit(silownik.poz, 0, 1);

    // piec
    piec.Twyj = piec.inerWyjscia.step(zawor.Twyj + piec.Tpodw);

    // czas
    time += dt;

    // logger
    log.log();
}

void Model::done()
{
    log.close();
}


void Model::Inercja::init(double dt, double T, double delay, double x0)
{
    this->dt = dt;
    Tinv = 1.0 / T;
    x = x0;
    size_t histCount = (size_t)(delay / dt + 0.5);
    while (histCount)
    {
        hist.push(x0);
        histCount--;
    }
}


double Model::Inercja::step(double U)
{
    double result;
    double dx = Tinv * (U - x);
    x += dx * dt;
    if (hist.size() > 0)
    {
        result = hist.front();
        hist.pop();
        hist.push(x);
    }
    else
    {
        result = x;
    }
    return result;
}

void Model::Piec::step()
{
    YTwyj = iner(UTpowr + UTmoc);
}

void Model::Ster::step()
{
    if (hister(UTzas, Tzasmin, Tzasmax)) {
        YTdodana = KPster * (Tpieczadana - UTpiec);
        YTdodana = range(YTdodana, 3, 10);
        Ycwu = 1;
    } else {
        YTdodana = 0;
        Ycwu = 0;
    }
    YTmoc = iner(YTdodana);
}

void Model::Powr::step()
{
    YTczuj = iner(UTwej);
}

void Model::Zawor::step()
{
    YTwyj = Usil * UTsprz + (1 - Usil) * UTpiec;
}
