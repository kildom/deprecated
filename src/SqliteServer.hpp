#pragma once

#include <functional>
#include <queue>

#include "Utils.hpp"
#include "Server.hpp"


class SqliteServer;

class Timer: public SharedBase
{
public:
    Timer(uint64_t expirationTime, const std::function<void()> &callback) :
        expirationTime(expirationTime), callback(callback)
    { }
    const uint64_t expirationTime;
    std::function<void()> callback;
    void cancel() {
        callback = nullptr;
    }
};


class SqliteServer: private ServerListener
{
private:

    struct TimerCompare
    {
        bool operator()(const SP<Timer> &a, const SP<Timer> &b) {
            return a->expirationTime > b->expirationTime;
        }
    };

public:
    SqliteServer();
    virtual ~SqliteServer() = default;

    void execute(const string &bindSpec);

    void stop() {
        server.stop();
    }

    WP<Timer> setTimeout(uint32_t timeoutMs, const std::function<void()> &callback);

private:
    Server server;
    std::priority_queue<SP<Timer>, std::vector<SP<Timer>>, TimerCompare> timers;

    void onConnected(const SP<Socket> &socket) override;
    void onData(const SP<Socket> &socket) override;
    void onClosed(const SP<Socket> &socket, const string *errorMessage) override;
    void onStop() override;
};
