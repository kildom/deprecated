
#include "AuthConnection.hpp"
#include "Protocol.hpp"


void AuthConnection::onData()
{

    UP<Command> command = co_await readCommand();
    auto serverLocked = this->server.lock(); // TODO: Before server stops, this function must exit, e.g. because of throwing

    auto connectCommand = command->as<ConnectCommand>();

    if (!connectCommand) {
        throw ClientError("Expected ConnectCommand as the first command!");
    }

    auto lock = co_await serverLocked->readLock(shared_from_this<AuthConnection>()); // TODO: Server must send periodically BUSY

    auto user = serverLocked->users->getUser(connectCommand->userName);
    if (!user) {
        throw ClientError("User not found!");
    }

    ConnectResponse response;

    response.userSalt = user->getSalt();
    response.serverSalt = getCryptoRandom(16);
    response.serverEphemeralPublicKey;

    response.writeToSocket(socket);

    socket->setKey(...);

    command = co_await readCommand();

    auto authCommand = command->as<AuthCommand>();

    string databasePassword = user->getDatabasePassword(authCommand->decryptKey); // TODO: Throws error if password decryption fails

    serverLocked->registerDatabasePassword(databasePassword); // TODO: server should forget if all connections are closed
                                                              // TODO: server should throw if it already has different password


    AuthResponse authResponse;
    authResponse.writeToSocket(socket);

    lock.unlock();

    UP<Statement> statement;

    do {
        command = co_await readCommand();

        if (command->type == QueryCommand::TYPE) {
            auto queryCommand = command->as<QueryCommand>();
            statement = statementFromCommand(serverLocked->getDatabase(queryCommand->databaseName), queryCommand);
        }

    } while (true);
  


    uint8_t *buffer;
    size_t size = socket->read(buffer);
    if (size == 0) {
        return;
    }

    UP<Command> command = Command::parse(buffer, size);

    auto connectCommand = command->as<ConnectCommand>();

    if (!connectCommand) {
        socket->error("Expected ConnectCommand as the first command!");
        return;
    }

    server.lock()->readLock(shared_from_this<AuthConnection>(), []() {
        // No-op callback, we just want to acquire the lock before processing the command
    });

    if (server->isWriteLocked()) {
        BusyResponse response;
        response.writeToSocket(socket);
        return;
    }

    auto user = serverLocked->users->getUser(connectCommand->userName);
    if (!user) {
        socket->error("User not found!");
        return;
    }

    ConnectResponse response;

    response.userSalt = user->getSalt();
    response.serverSalt = getCryptoRandom(16);
    response.serverEphemeralPublicKey;

    response.writeToSocket(socket);
}

void AuthConnection::onClosed(const string *errorMessage)
{
    // Implementation for handling closed connection
}
