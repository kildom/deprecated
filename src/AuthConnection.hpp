#pragma once

#include "Utils.hpp"
#include "SqliteServer.hpp"
#include "EncryptedSocket.hpp"
#include "BaseConnection.hpp"

class AuthConnection: public BaseConnection
{
public:
    AuthConnection(WP<SqliteServer> server, SP<EncryptedSocket> socket) :
        server(server), socket(socket)
    {
    };
    virtual ~AuthConnection() = default;

    virtual void send(const uint8_t *data, size_t length) = 0;
private:
    WP<SqliteServer> server;
    SP<EncryptedSocket> socket;

    virtual void onData() override;
    virtual void onClosed(const string *errorMessage) override;
};
