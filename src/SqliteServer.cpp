
#include <memory>
#include "SqliteServer.hpp"
#include "EncryptedSocket.hpp"
#include "AuthConnection.hpp"
#include "BaseConnection.hpp"

constexpr uint32_t TIMER_CHECK_INTERVAL_MS = 1000 * 60 * 60; // 1 hour

SqliteServer::SqliteServer()
{
}

void SqliteServer::execute(const string &bindSpec)
{
    std::vector<SP<Timer>> expiredTimers;
    SP<ServerListener> listenerSelf = shared_from_this<ServerListener>();

    if (!server.start(bindSpec, listenerSelf)) {
        // TODO: Report fatal server error
        return;
    }

    do {
        auto now = getRunTimeMs();
        expiredTimers.clear();
        while (!timers.empty() && timers.top()->expirationTime <= now) {
            expiredTimers.emplace_back(timers.top());
            timers.pop();
        }
        for (const auto &timer : expiredTimers) {
            if (timer->callback) {
                timer->callback();
            }
        }

        uint32_t timeoutMs = TIMER_CHECK_INTERVAL_MS;
        if (!timers.empty()) {
            const uint64_t nextExpiration = timers.top()->expirationTime;
            timeoutMs = std::min<uint64_t>(TIMER_CHECK_INTERVAL_MS, nextExpiration - now);
        }

        if (!server.poll(timeoutMs + 1)) {
            break;
        }
    } while (true);
}


WP<Timer> SqliteServer::setTimeout(uint32_t timeoutMs, const std::function<void()> &callback)
{
    auto timer = std::make_shared<Timer>(getRunTimeMs() + timeoutMs, callback);
    timers.emplace(timer);
    return timer;
}

void SqliteServer::onConnected(const SP<Socket> &socket)
{
    auto encryptedSocket = std::make_shared<EncryptedSocket>(socket);
    auto authConnection = std::make_shared<AuthConnection>(shared_from_this<SqliteServer>(), encryptedSocket);
    socket->userData = SP<BaseConnection>(authConnection);
    // TODO: Log new connection: id - from ID generator, remote address
}

void SqliteServer::onData(const SP<Socket> &socket)
{
    if (socket->userData.has_value()) {
        auto connection = std::any_cast<SP<BaseConnection>>(socket->userData);
        connection->onData();
    } else {
        socket->close();
    }
}

void SqliteServer::onClosed(const SP<Socket> &socket, const string *errorMessage)
{
    if (socket->userData.has_value()) {
        auto connection = std::any_cast<SP<BaseConnection>>(socket->userData);
        connection->onClosed(errorMessage);
    }
}

void SqliteServer::onStop()
{
}
