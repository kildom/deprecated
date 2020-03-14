


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


void Logger::init(double** values, double* maxDeltas)
{
    double** ptr = values;
    size = 0;
    while (*ptr)
    {
        size++;
        ptr++;
    }
    lastLogValues.assign(maxDeltas, maxDeltas + size);
    this->maxDeltas.assign(maxDeltas, maxDeltas + size);
    this->values.assign(values, values + size);
    first = true;
    file = fopen("data/data.csv", "wb");
}

void Logger::log(bool force)
{
    force = force || first;
    first = false;

    if (!force)
    {
        for (int i = 0; i < size; i++)
        {
            if (abs(lastLogValues[i] - *(values[i])) >= maxDeltas[i])
            {
                force = true;
                break;
            }
        }
    }

    if (!force) return;

    std::string buffer;
    buffer.resize(size * 30);
    char* ptr = (char*)buffer.c_str();

    for (int i = 0; i < size; i++)
    {
        double val = *(values[i]);
        lastLogValues[i] = val;
        int n = sprintf(ptr, "%.17g%s", val, i < size - 1 ? INT_SEP : "\r\n");
        if (INT_DOT != '.')
        {
            char* dot;
            while ((dot = strchr(ptr, '.')))
            {
                *dot = INT_DOT;
            }
        }
        ptr += n;
    }

    fwrite(buffer.c_str(), 1, strlen(buffer.c_str()), file);

}

void Logger::close()
{
    fclose(file);
}
