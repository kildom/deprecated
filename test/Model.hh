#ifndef _MODEL_H
#define _MODEL_H

#include <queue>
#include <cmath>

#include "ModelCommon.hh"
#include "Logger.hh"

class Model
{
private:
    
    class Inercja
    {
        public:
            void init(num dt, num T, num delay, num x0);
            num operator()(num U);
        private:
            num dt;
            num Tinv;
            num x;
            std::queue<num> hist;
    };

    class Histereza
    {
        public:
            void init(num state);
            num operator()(num U, num min, num max);
        private:
            num state;
    };

public:

    Logger log;

    num T;
    num dt;

    Model();
    void init();
    void steps(int steps);
    int steps(num toTime);
    void step();
    void done();

private:
    static inline num range(num x, num min, num max)
    {
        return (x < min) ? min : (x > max) ? max : x;
    }

    struct Sub {
        num dt;
    };

public:
#include "ModelSub.hh"

};

#endif
