#include <cstring>

#include <botan/exceptn.h>

#include "Utils.hpp"
#include "Server.hpp"
#include "EncryptedSocket.hpp"


constexpr size_t MINIMAL_BUFFER_MARGIN = 256;
constexpr size_t GROW_FACTOR[2] = { 3, 2 };
constexpr uint32_t INCOMING_BEGIN_MARKER = 0x50dd3ac6;
constexpr uint32_t OUTGOING_BEGIN_MARKER = 0xe859c294;
constexpr uint32_t MAX_INCOMING_MESSAGE_SIZE = 1024 * 1024; // 1 MiB


EncryptedSocket::EncryptedSocket(const SP<Socket> &socket) :
    socket(socket),
    incomingNonce(0),
    outgoingNonce(0x8000000000000000uLL),
    headerSize(0),
    inputDataSize(0),
    outputDataSize(0),
    dataVector(MINIMAL_BUFFER_MARGIN),
    enc(Botan::AEAD_Mode::create_or_throw("AES-128/GCM(12)", Botan::Cipher_Dir::Encryption)),
    dec(Botan::AEAD_Mode::create_or_throw("AES-128/GCM(12)", Botan::Cipher_Dir::Decryption))
{
    Botan::secure_vector<uint8_t> zeroKey(16, 0);
    enc->set_key(zeroKey.data(), zeroKey.size());
    dec->set_key(zeroKey.data(), zeroKey.size());
}

EncryptedSocket::~EncryptedSocket() = default;

size_t EncryptedSocket::read(uint8_t* &buffer)
{
    if (outputDataSize != 0) {
        socket->error("Invalid command sequence!");
        return 0;
    }

    if (headerSize < 8) {
        auto res = socket->read((uint8_t*)&header + headerSize, 8 - headerSize);
        headerSize += res;

        if (headerSize == 0) {
            return 0;
        }

        if (headerSize < 8) {
            return 0;
        } else if (header.marker != INCOMING_BEGIN_MARKER) {
            socket->error("Invalid message header");
            return 0;
        } else if (header.size > MAX_INCOMING_MESSAGE_SIZE || header.size < 20) {
            socket->error("Incoming message size exceeds limit");
            return 0;
        }

        dataVector.resize(header.size - 8);
        inputDataSize = 0;
    }

    do {
        auto res = socket->read(dataVector.data() + inputDataSize, header.size - 8 - inputDataSize);
        if (res == 0) {
            return 0;
        }
        inputDataSize += res;
    } while (inputDataSize < dataVector.size());

    dec->set_associated_data((uint8_t*)&header.size, sizeof(header.size));
    dec->start((uint8_t*)&incomingNonce, sizeof(incomingNonce));
    incomingNonce++;
    inputDataSize = 0;
    headerSize = 0;
    try {
        dec->finish(dataVector);
    } catch(Botan::Invalid_Authentication_Tag&) {
        socket->error("Decryption failed");
        return 0;
    }
    buffer = dataVector.data();
    return dataVector.size();
}

void EncryptedSocket::outputStart(size_t sizeHint)
{
    if (headerSize != 0) {
        socket->error("Invalid command sequence!");
        return;
    }

    if (sizeHint == 0) {
        sizeHint = MINIMAL_BUFFER_MARGIN;
    }
    sizeHint += 8 + 12; // header + tag
    if (dataVector.capacity() > dataVector.size()) {
        dataVector.resize(dataVector.capacity());
    }
    if (dataVector.size() < sizeHint) {
        dataVector.resize(sizeHint);
        if (dataVector.capacity() > dataVector.size()) {
            dataVector.resize(dataVector.capacity());
        }
    }

    outputDataSize = 8;
}

size_t EncryptedSocket::outputWrite(const BytesView& data, size_t sizeHint)
{
    if (outputDataSize == 0 || headerSize != 0) {
        socket->error("Internal error: Invalid function call sequence!");
        return 0;
    }
    if (outputDataSize + data.size > dataVector.size()) {
        size_t newSize;
        if (sizeHint == 0) {
            newSize = std::max(dataVector.size() * GROW_FACTOR[0] / GROW_FACTOR[1],
                outputDataSize + data.size + MINIMAL_BUFFER_MARGIN);
        } else {
            newSize = outputDataSize + data.size + sizeHint;
        }
        dataVector.resize(newSize);
        if (dataVector.capacity() > dataVector.size()) {
            dataVector.resize(dataVector.capacity());
        }
    }
    std::memcpy(dataVector.data() + outputDataSize, data.data(), data.size);
    outputDataSize += data.size;
    return outputDataSize;
}

size_t EncryptedSocket::outputFinish()
{
    header.marker = OUTGOING_BEGIN_MARKER;
    header.size = outputDataSize + 12;
    memcpy(dataVector.data(), &header, 8);

    enc->set_associated_data((uint8_t*)&header.size, sizeof(header.size));
    enc->start((uint8_t*)&outgoingNonce, sizeof(outgoingNonce));
    outgoingNonce++;
    dataVector.resize(outputDataSize);
    outputDataSize = 0;
    enc->finish(dataVector, 8);

    return socket->write(dataVector.data(), dataVector.size());
}

void EncryptedSocket::setKey(const BytesView& newKey)
{
    if (newKey.size != 16) {
        socket->error("Internal error: Invalid key size");
        return;
    }
    enc->set_key(newKey.data(), newKey.size);
    dec->set_key(newKey.data(), newKey.size);
}

void EncryptedSocket::close()
{
    socket->close();
}

void EncryptedSocket::error(const string &message)
{
    socket->error(message);
}
