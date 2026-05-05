#pragma once

#include <botan/aead.h>

#include "Utils.hpp"
#include "Server.hpp"


/** @brief A wrapper around Socket that provides encryption and decryption of data using AEAD.
 * 
 * This class provides encrypted message exchange over a Socket. It is not stream-based, but message-based.
 * Each message is encrypted and authenticated using AES-128-GCM.
 * 
 * It is designed to work in half-duplex mode, so just one side can send data at a time.
 * If this is not the case, error will be reported to underlying Socket and the connection will be closed.
 * 
 * If any encryption, decryption or authentication error occurs, it will be reported to underlying Socket
 * and the connection will be closed.
 * 
 * Entire communication uses little-endian format.
 * 
 * AES-128-GCM parameters:
 * - Key size: 16 bytes
 * - Nonce size: 64 bits (8 bytes)
 * - Tag size: 12 bytes
 * - Additional authenticated data: 4 bytes - entire encrypted message length (messageLength)
 * 
 * Message format:
 *   uint32_t beginMarker; // different for incoming and outgoing messages, details below
 *   uint32_t messageLength; // including header and tag
 *   uint8_t encryptedData[messageLength - 20]; // AES-128-GCM encrypted data
 *   uint8_t tag[12]; // AES-128-GCM authentication tag
 * 
 * Nonce details:
 * - it is 64-bit counter,
 * - the counters are separate for incoming and outgoing messages,
 * - incremented by 1 for each message,
 * - initial value for incoming messages is 0, for outgoing messages is 0x8000000000000000
 * 
 * beginMarker details:
 * - constant value starting each message, used to detect message boundaries and validate the message format
 * - for incoming messages: INCOMING_BEGIN_MARKER = 0x50dd3ac6
 * - for outgoing messages: OUTGOING_BEGIN_MARKER = 0xe859c294
 * 
 * Errors are not reported by this API. Instead, they are reported to the underlying Socket. This will
 * pass the error to the server listener. It gives one place to handle all errors related to the connection.
 * 
 * Initial key value is zeros, so initially the communication is not secure. It provides only partial integrity
 * protection. In that state, it is used to do some handshake to establish the key.
 * The key should be set to a secure value using setKey function before sending or receiving any sensitive data.
 */
class EncryptedSocket
{
public:
    /** @brief Create an EncryptedSocket wrapping around the given Socket.
     * 
     * @param socket The underlying Socket to wrap. The EncryptedSocket takes shared ownership of the Socket.
     *               It should not be used for sending or receiving data directly after being wrapped.
     */
    EncryptedSocket(const SP<Socket> &socket);

    /** @brief Destroy the EncryptedSocket and release the underlying Socket.
     */
    ~EncryptedSocket();

    EncryptedSocket(const EncryptedSocket&) = delete;
    EncryptedSocket& operator=(const EncryptedSocket&) = delete;

    /** @brief Read decrypted message.
     * 
     * You cannot call this function while there is an outgoing message being sent.
     * 
     * @param buffer A reference to a pointer where the decrypted message will be stored.
     *               It will be unchanged if functions returns 0. The buffer will be valid until
     *               the next call to this wrapper.
     * @return The size of the decrypted message. 0 if there is no message or it is not fully received yet.
     */
    size_t read(uint8_t* &buffer);

    /** @brief Start sending an encrypted message.
     * 
     * You cannot call this function while there is an outgoing message being received.
     * 
     * @param sizeHint A hint for the expected size of the message for optimization purposes.
     */
    void outputStart(size_t sizeHint = 0);

    /** @brief Write data to the message being sent.
     * 
     * It can be called multiple times after outputStart.
     * This function does not send the data immediately, but buffers it until outputFinish is called.
     * 
     * @param data The data to write to the message.
     * @param sizeHint A hint for the expected size of the remaining message for optimization purposes.
     * @return Current size of the message that has been buffered.
     */
    size_t outputWrite(const BytesView& data, size_t sizeHint = 0);

    /** @brief Finish preparing the message, encrypt it and send it over the underlying Socket.
     * 
     * @return The number of bytes that were not sent over the underlying Socket and they are buffered.
     *         This will happen if the client is slow to receive data and system buffers are full.
     *         If all data is sent, it will return 0.
     */
    size_t outputFinish();

    /** @brief Close the underlying Socket.
     */
    void close();

    /** @brief Set the encryption key for this EncryptedSocket.
     * 
     * @param newKey The new encryption key. It must be 16 bytes long.
     */
    void setKey(const BytesView& newKey);

    /** @brief Report an error to the underlying Socket.
     *
     * @param message The error message to report.
     */
    void error(const string &message);

private:

    struct Header {
        uint32_t marker;
        uint32_t size;
    };

    Header header;
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
