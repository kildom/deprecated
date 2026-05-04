#pragma once

#include <botan/aead.h>

#include "Utils.hpp"
#include "Server.hpp"


class EncryptedSocket
{
public:
    EncryptedSocket(const SP<Socket> &socket);
    ~EncryptedSocket();

    EncryptedSocket(const EncryptedSocket&) = delete;
    EncryptedSocket& operator=(const EncryptedSocket&) = delete;

    BytesView& read();
    void outputStart(size_t sizeHint = 0);
    size_t outputWrite(const BytesView& data, size_t sizeHint = 0);
    size_t outputFinish();
    void close();
    void setKey(const BytesView& newKey);
    void error(const string &message);

private:
    SP<Socket> socket;
    uint64_t incomingNonce;
    uint64_t outgoingNonce;
    size_t headerSize;
    size_t inputDataSize;
    size_t outputDataSize;
    Botan::secure_vector<uint8_t> dataVector;
    UP<Botan::AEAD_Mode> enc;
    UP<Botan::AEAD_Mode> dec;
};
