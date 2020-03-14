#ifndef _MODEL_H
#define _MODEL_H

#include <stdio.h>

#include <vector>

class Logger
{
private:
    bool first;
    int size;
    std::vector<double*> values;
    std::vector<double> maxDeltas;
    std::vector<double> lastLogValues;
    FILE* file;
public:
    void init(double** values, double* maxDeltas);
    void log(bool force = false);
    void close();
};

class Model
{
public:

    Logger log;

    double time;
    double dt;

    struct
    {
        double czasOtw;
        double poz;
    } silownik;

    struct
    {
        double Twyj;
    } zawor;

    struct
    {
        double sil;
    } input;
    
    Model();
    void steps(int steps);
    int steps(double toTime);
    void done();

private:
    inline double diff(double expr)
    {
        return expr * dt;
    }

    inline void limit(double& value, double min, double max)
    {
        if (value < min) value = min;
        if (value > max) value = max;
    }

};

#endif
