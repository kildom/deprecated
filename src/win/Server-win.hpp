#pragma once

#if defined(_WIN32) || defined(_WIN64)

#include "../Utils.hpp"


class SocketOs: public SharedBase {
protected:
    int read(bytes &buffer, int offset, int length);
    int write(const bytes &data, int offset, int length);
    void close();
};

class ServerOs: public SharedBase
{
public:
    ServerOs(const string &bindSpec, const WP<ServerListener>& listener);
    bool start();
    bool poll(int timeoutMs);
    void stop();
};


#endif // defined(_WIN32) || defined(_WIN64)
