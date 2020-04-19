#include <algorithm>
#include <iterator>
#include <string>
#include <math.h>
#include <string.h>

#include "Logger.hh"


#define INT_SEP ";"
#define INT_DOT ','


void Logger::init(num** values, num* maxDeltas)
{
    num** ptr = values;
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
        num val = *(values[i]);
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
