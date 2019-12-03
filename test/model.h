
#include <vector>

class Obj;
class Input;
class Output;


typedef void (*OutputCalcFunc)(void*);

class Input
{
public:
    double* value;
    Output* output;
};

class Output
{
public:
    double value;
    OutputCalcFunc func;
    void* ptr;
    std::vector<Input> dependsOn;
};

class Obj
{
    public:
};

