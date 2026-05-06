#pragma once

#include "Utils.hpp"

class BaseConnection: public SharedBase
{
public:
    virtual ~BaseConnection() = default;
    virtual void onData() = 0;
    virtual void onClosed(const string *errorMessage) = 0;
};
