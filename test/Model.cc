

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
#define MIN(x) ((x)*60.0)
#define GODZ(x) ((x)*60.0 * 60.0)

Model::Model()
{
    init();

    num *values[] = {
        &T,
        &piec.YTwyj,
        &ster.YTdodana,
        NULL,
    };
    num deltas[] = {
        10,
        1,
        0.5,
    };
    log.init(values, deltas);
    log.log(true);
}

void Model::init()
{
    T = 0;
    dt = 0.1;

    piec.iner.init(dt, TMIN(10), TMIN(5), 20);
    piec.YTwyj = 20;
    piec.dt = dt;

    czujnik.iner.init(dt, TMIN(1), TMIN(1), 20);
    czujnik.y = 20;
    czujnik.dt = dt;

    zawor.YTwyj = 20;
    zawor.dt = dt;

    sprz.K = 0.5; // Ile razy pomp. zasobnika jest mocniejsza niż pomp. pieca
    sprz.YTciepl = 20;
    sprz.YTzimn = 20;
    sprz.dt = dt;

    silownik.y = 0;
    silownik.Ksil = 1.0 / TMIN(2); // Prędkość otw./zam. zaworu [obr./s]
    silownik.dt = dt;

    zasob.x = 20;
    zasob.Kgrz = 0.1;    // Wzrost temp. zasobn. na każdy stopień różnicy temp. (°C/s) / °C
    zasob.Kodplyw = 0.1; // Spadek temp. zasob. przy max. odpływie na każdy st. różnicy temp. (°C/s) / °C
    zasob.Twod = 15;     // Temp. wody z wodociągu °C
    zasob.y = 20;
    zasob.Kwymm = 0.7; // Sprawność wymiennika w zasobniku [0..1]
    zasob.dt = dt;

    ster.hister.init(-1);
    ster.Tzasmin = 38; // Zadana min. temp. zasob.
    ster.Tzasmax = 58; // Zadana max. temp. zasob.
    ster.YTdodana = 0;
    ster.KPster = 0.5;     // Wspolczynnik proporcjonalnosci
    ster.Tpieczadana = 70; // Zadana temp. na piecu
    ster.Ycwu = 1;
    ster.dt = dt;

    in.silownik = 0;
    in.pomp = 0;
    in.odplyw = 0;

    out.temp = 20;
    out.cwu = 0;
}

int Model::steps(num toTime)
{
    int steps = (toTime - T) / dt;
    if (steps <= 0)
        return 0;
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
    // objekty
    sub();

    // czas
    T += dt;

    // logger
    log.log();
}

void Model::done()
{
    log.close();
}

void Model::Inercja::init(num dt, num T, num delay, num x0)
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

num Model::Inercja::operator()(num U)
{
    num result;
    num dx = Tinv * (U - x);
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

void Model::Histereza::init(num state)
{
    this->state = state;
}

num Model::Histereza::operator()(num U, num min, num max)
{
    if (U < min && state > 0)
    {
        state = -1;
    }
    else if (U > max && state < 0)
    {
        state = 1;
    }
    return state;
}
