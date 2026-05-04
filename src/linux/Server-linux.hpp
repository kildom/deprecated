#pragma once

#if defined(__linux__) || defined(__unix__) || (defined(__APPLE__) && defined(__MACH__))

#include <csignal>
#include <map>
#include <optional>

#include "../Utils.hpp"

class ServerListener;
class Socket;

class SocketOs: public SharedBase {
protected:
    SocketOs() = default;
    int read(bytes &buffer, int offset, int length);
    int write(const bytes &data, int offset, int length);
    void close();

private:
    struct State;
    SP<State> state;

    friend class ServerOs;
};


class ServerOs: public SharedBase
{
public:
    ServerOs(const string &bindSpec, const WP<ServerListener>& listener);
    ~ServerOs();

    ServerOs(const ServerOs&) = delete;
    ServerOs& operator=(const ServerOs&) = delete;

    bool start();
    bool poll(int timeoutMs);
    void stop();

private:
    friend class SocketOs;

    void cleanupFds();
    void requestStop();
    bool isStopRequested() const;
    void wakePoller();
    void consumeWakeFd();
    bool updateClientEvents(const SP<Socket> &socket);
    void queueClose(const SP<Socket> &socket, std::optional<string> error);
    void flushSocketOutput(const SP<Socket> &socket);
    void finalizeQueuedCloses(const SP<ServerListener> &listenerSp);
    bool shutdownServer();
    bool setupListener();
    bool setupEpoll();
    void acceptNewConnections(const SP<ServerListener> &listenerSp);

    string bindSpec;
    WP<ServerListener> listener;

    int listenFd = -1;
    int epollFd = -1;
    int wakeFd = -1;

    bool started = false;
    bool stopNotified = false;
    volatile std::sig_atomic_t stopRequested = 0;

    std::map<int, SP<Socket>> sockets;
};

#endif // defined(__linux__) || defined(__unix__) || (defined(__APPLE__) && defined(__MACH__))