


#include <algorithm>
#include <iterator>
#include <string>
#include <math.h>
#include <string.h>

#define INT_SEP ";"
#define INT_DOT ','

#include "model.hh"


Model::Model()
{
    time = 0;
    dt = 0.1;
    silownik.czasOtw = 60.0;
    silownik.poz = 1;
    zawor.Twyj = 20;
    input.sil = -1;
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
        // zawor
        zawor.Twyj = silownik.poz;// * sprzeglo.Tciepla + (1.0 - silownik.poz * piec.Twyj)

        // silownik
        silownik.poz += diff(1.0 / silownik.czasOtw * input.sil);
        limit(silownik.poz, 0, 1);

        // czas
        time += dt;

        // logger
        log.log();
    }
}

void Model::done()
{
    log.close();
}

