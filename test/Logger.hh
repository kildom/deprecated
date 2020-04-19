#ifndef _LOGGER_HH_
#define _LOGGER_HH_

#include <stdio.h>
#include <vector>

#include "ModelCommon.hh"

class Logger
{
private:
    bool first;
    int size;
    std::vector<num*> values;
    std::vector<num> maxDeltas;
    std::vector<num> lastLogValues;
    FILE* file;
public:
    void init(num** values, num* maxDeltas);
    void log(bool force = false);
    void close();
};

#endif
