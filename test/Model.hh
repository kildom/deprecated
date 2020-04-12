#ifndef _MODEL_H
#define _MODEL_H

#include <queue>

#include "Logger.hh"

class Model
{
private:
    
    class Inercja
    {
        public:
            void init(double dt, double T, double delay, double x0);
            double step(double U);
        private:
            double dt;
            double Tinv;
            double x;
            std::queue<double> hist;
    };

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

    struct
    {
        Inercja inerWyjscia;
        Inercja inerCzujnika;
        Inercja inerMocy;
        double Twyj;
        double Tpodw;
    } piec;
    
    
    Model();
    void steps(int steps);
    int steps(double toTime);
    void step();
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

    struct Sub {
        double dt;
        double t;
    };

    struct Piec : public Sub {
        void step();
        double YTwyj, UTpowr, UTmoc;
        Inercja iner;
    } piec;

    struct Powrot : public Sub {
        void step();
        double YTczuj, UTwej;
        Inercja iner;
    } powrot;

};

#endif
