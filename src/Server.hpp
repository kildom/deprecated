#pragma once

#include <any>
#include <memory>

#include "Utils.hpp"
#include "win/Server-win.hpp"
#include "linux/Server-linux.hpp"


/** @brief Provides a simple abstraction for a socket connection.
 * 
 * The platform-specific implementation is in SocketOs.
 */
class Socket: public SocketOs
{
public:

    /** @brief A placeholder for user-defined data associated with the socket.
     */
    std::any userData;

    /** @brief Read data from the socket into the provided buffer.
     * 
     * This call is always non-blocking.
     * 
     * Normally, this function should be called from onData callback of ServerListener.
     * If not all data can be read at once, onData will be triggered again until all data is read.
     * 
     * @param buffer The buffer to read data into.
     * @param length The maximum number of bytes to read.
     * @return       The number of bytes actually read. If read would block, or the connection
     *               is closed, or an error occurs, it should return 0.
     */
    size_t read(uint8_t* buffer, size_t length)
    {
        return SocketOs::read(buffer, length);
    }

    /** @brief Write data to the socket.
     * 
     * This call is always non-blocking. If not all data can be written at once, the rest will be buffered.
     * 
     * @param buffer The data to write to the socket.
     * @param length The maximum number of bytes to write.
     * @return       Current size of buffered data that has not been sent yet.
     *               If the connection is closed or an error occurs, it returns 0.
     */
    size_t write(const uint8_t *buffer, size_t length)
    {
        return SocketOs::write(buffer, length);
    }

    /** @brief Close the socket.
     * 
     * This call is always non-blocking. It will cause onClosed callback after the socket is actually closed.
     * Actual closing may be delayed to Server::poll function before onClosed is called.
     * 
     * The OS implementation may simply mark the socket as closed and delay the actual closing until Sever::poll is
     * called.
     */
    void close()
    {
        SocketOs::close();
    }

    /** @brief Report fatal error in received data.
     *
     * This function can be called if incoming data is malformed or violates the protocol in some way.
     * It will propagate this error to server implementation, close the socket and trigger appropriate callbacks.
     */
    void error(const string &message)
    {
        SocketOs::error(message); // TODO: Implement this in SocketOs
    }
};


/** @brief Interface for receiving server events.
 * 
 * The socket parameter is a shared pointer and listener can keep a reference to it if needed.
 * In that case, make sure that you are not creating a reference cycle with Socket::userData field.
 * Use weak pointers if necessary to avoid that.
 * 
 * All callback are called from one thread, from within the Server::poll function.
 */
class ServerListener
{
public:
    virtual ~ServerListener() = default;

    /** @brief Called when a new client connects to the server.
     * 
     * Once this callback is called, the server will always call related onClosed once the connection is closed
     * for any reason.
     * 
     * @param socket The socket representing the new connection.
     */
    virtual void onConnected(const SP<Socket>& socket) = 0;

    /** @brief Called when data is available to read from a socket.
     * 
     * @param socket The socket with available data.
     */
    virtual void onData(const SP<Socket>& socket) = 0;

    /** @brief Called when a socket is closed.
     * 
     * It is always called exactly once for each socket, even if the socket is closed due to an error.
     * 
     * @param socket The socket that was closed.
     * @param errorMessage A description of the error, or nullptr if the socket was closed without an error.
     *                     The value is valid only during the call and should not be stored or used after that.
     */
    virtual void onClosed(const SP<Socket>& socket, const string *errorMessage) = 0;

    /** @brief Called when the server is stopped.
     */
    virtual void onStop() = 0;
};


/** @brief Server class that provides a high-level interface for managing server operations.
 * 
 * This class inherits from ServerOs and delegates the actual server operations to it.
 * The platform-specific implementation is in ServerOs.
 */
class Server: public ServerOs
{
public:

    /** @brief Construct a new Server object.
     * 
     * @param bindSpec The binding specification for the server. This is in format "host:port".
     * @param listener The listener for server events. If the listener is destroyed while the server is still running,
     *                 the server will stop.
     */
    Server(const string &bindSpec, const WP<ServerListener>& listener):
        ServerOs(bindSpec, listener)
    { }

    /** @brief Start the server.
     * 
     * @return True if the server started successfully, false otherwise.
     */
    bool start()
    {
        return ServerOs::start();
    }

    /** @brief Poll the server for events.
     * 
     * If any event occurs, appropriate callback in ServerListener will be called within this function.
     *
     * It always returns after the specified timeout. The events do not reset the timeout.
     * To ensure that, the implementation should use an absolute time point for waiting instead of a relative timeout.
     * 
     * @param timeoutMs The maximum time to wait for events, in milliseconds. A negative value means infinite timeout.
     * @return True if the server is still running after the timeout, false if it has been stopped.
     */
    bool poll(int timeoutMs)
    {
        return ServerOs::poll(timeoutMs);
    }

    /** @brief Stop the server.
     * 
     * This is the only function from this API that can be called from another thread or even from a linux signal
     * handler. All other functions should only be called from the thread that started the server.
     * 
     * The implementation should pay a very special attention to ensure that this function is thread-safe and can
     * be called from a linux signal handler.
     * 
     * This is non-blocking, asynchronous function. It returns immediately and the server will be stopped shortly
     * after that.
     */
    void stop()
    {
        ServerOs::stop();
    }
};
