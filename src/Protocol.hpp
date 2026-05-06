#pragma once

#include <stdint.h>
#include <array>

#include "Utils.hpp"

struct CommandId {
    enum
    {
        AuthRequest = 0x01,
        AuthResponse = 0x02,
        QueryRequest = 0x03,
        QueryResponse = 0x04,
        ErrorResponse = 0x05,
    };
};



template<typename T, typename Enable = void>
struct _CommandParserHelper {};

class CommandParser
{
public:
    const uint8_t *buffer;
    size_t size;
    CommandParser(const BytesView& source) : buffer(source.data()), size(source.size) {}
    template<typename T>
    CommandParser& operator()(T &value) {
        _CommandParserHelper<T>::parse(this, value);
        return *this;
    }
};

template<typename T>
struct _CommandParserHelper<T, std::enable_if_t<std::is_integral_v<T>>> {
    static void parse(CommandParser* parser, T& value) {
        if (parser->size < sizeof(T)) {
            // TODO: Handle error
            return;
        }

        value = *(T*)parser->buffer;

        parser->buffer += sizeof(T);
        parser->size -= sizeof(T);
    }
};

template<typename T>
struct _CommandParserHelper<std::basic_string<T>> {
    static void parse(CommandParser *parser, std::basic_string<T> &value) {
        if (parser->size < sizeof(uint32_t)) {
            // TODO: Handle error
            return;
        }
        uint32_t length = *(uint32_t *)parser->buffer;
        parser->buffer += sizeof(uint32_t);
        parser->size -= sizeof(uint32_t);
        if (parser->size < length * sizeof(T)) {
            // TODO: Handle error
            return;
        }
        value.assign((T *)parser->buffer, length);
        parser->buffer += length * sizeof(T);
        parser->size -= length * sizeof(T);
    }
};

template<typename T, size_t N>
struct _CommandParserHelper<std::array<T, N>, std::enable_if_t<std::is_integral_v<T>>> {
    static void parse(CommandParser *parser, std::array<T, N> &value) {
        if (parser->size < N * sizeof(T)) {
            // TODO: Handle error
            return;
        }
        std::memcpy(value.data(), parser->buffer, N * sizeof(T));
        parser->buffer += N * sizeof(T);
        parser->size -= N * sizeof(T);
    }
};

struct ConnectCommand
{
    static constexpr uint32_t TYPE = 1;

    uint32_t type;
    std::array<uint8_t, 64> clientEphemeralPublicKey;
    std::array<uint8_t, 16> clientSalt;
    string databaseName;
    string userName;

    ConnectCommand(const BytesView& source)
    {
        CommandParser(source)
            (type)
            (clientEphemeralPublicKey)
            (clientSalt)
            (databaseName)
            (userName);
    }
};

struct ConnectResponse
{
    static constexpr uint32_t TYPE = 2;

    uint32_t type;
    std::array<uint8_t, 64> serverEphemeralPublicKey;
    std::array<uint8_t, 16> serverSalt;
    std::array<uint8_t, 16> userSalt;

    ConnectResponse
};

/*

    type = 2 // server authentication
    byte[] server_ephemeral_public_key; // random value generated on program start
    byte[] server_salt; // random value generated for each connection
    byte[] user_salt; // random salt stored in user record
    */