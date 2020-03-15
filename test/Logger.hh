#ifndef _LOGGER_HH_
#define _LOGGER_HH_

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

#endif
