#if defined(__linux__) || defined(__unix__) || (defined(__APPLE__) && defined(__MACH__))

#include "Server-linux.hpp"

#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstring>
#include <limits>
#include <map>
#include <optional>

#include <arpa/inet.h>
#include <fcntl.h>
#include <netdb.h>
#include <netinet/tcp.h>
#include <sys/epoll.h>
#include <sys/eventfd.h>
#include <sys/socket.h>
#include <unistd.h>

#include "../Server.hpp"

namespace {

constexpr int kMaxEvents = 64;

int setNonBlocking(int fd)
{
	const int old_flags = ::fcntl(fd, F_GETFL, 0);
	if (old_flags < 0) {
		return -1;
	}
	if (::fcntl(fd, F_SETFL, old_flags | O_NONBLOCK) < 0) {
		return -1;
	}
	return 0;
}

int clampEpollTimeoutMs(long long timeoutMs)
{
	if (timeoutMs < 0) {
		return -1;
	}
	if (timeoutMs > std::numeric_limits<int>::max()) {
		return std::numeric_limits<int>::max();
	}
	return static_cast<int>(timeoutMs);
}

std::optional<std::pair<string, string>> parseBindSpec(const string &bindSpec)
{
	const size_t colon = bindSpec.rfind(':');
	if (colon == string::npos || colon == 0 || colon + 1 >= bindSpec.size()) {
		return std::nullopt;
	}

	string host = bindSpec.substr(0, colon);
	string port = bindSpec.substr(colon + 1);
	if (port.empty()) {
		return std::nullopt;
	}

	if (host == "*") {
		host.clear();
	}
	return std::make_pair(std::move(host), std::move(port));
}

string errnoToString(const char *prefix)
{
	return string(prefix) + ": " + std::strerror(errno);
}

} // namespace

struct SocketOs::State {
	explicit State(ServerOs *ownerServer, int socketFd)
		: owner(ownerServer), fd(socketFd)
	{
	}

	ServerOs *owner = nullptr;
	int fd = -1;
	bytes pendingWrite;
	bool closed = false;
	bool closeQueued = false;
	bool closeNotified = false;
	std::optional<string> closeError;
};

ServerOs::ServerOs(const string &bindSpec, const WP<ServerListener> &listener)
	: bindSpec(bindSpec), listener(listener)
{
}

ServerOs::~ServerOs()
{
	cleanupFds();
}

void ServerOs::cleanupFds()
{
	for (auto &entry : sockets) {
		SP<Socket> socket = entry.second;
		if (socket && socket->SocketOs::state) {
			socket->SocketOs::state->fd = -1;
			socket->SocketOs::state->closed = true;
		}
		if (entry.first >= 0) {
			::close(entry.first);
		}
	}
	sockets.clear();

	if (listenFd >= 0) {
		::close(listenFd);
		listenFd = -1;
	}
	if (wakeFd >= 0) {
		::close(wakeFd);
		wakeFd = -1;
	}
	if (epollFd >= 0) {
		::close(epollFd);
		epollFd = -1;
	}
	started = false;
}

void ServerOs::requestStop()
{
	stopRequested = 1;
}

bool ServerOs::isStopRequested() const
{
	return stopRequested != 0;
}

void ServerOs::wakePoller()
{
	if (wakeFd < 0) {
		return;
	}

	uint64_t one = 1;
	while (true) {
		const ssize_t written = ::write(wakeFd, &one, sizeof(one));
		if (written == static_cast<ssize_t>(sizeof(one))) {
			return;
		}
		if (written < 0 && errno == EINTR) {
			continue;
		}
		return;
	}
}

void ServerOs::consumeWakeFd()
{
	if (wakeFd < 0) {
		return;
	}

	uint64_t value = 0;
	while (true) {
		const ssize_t readBytes = ::read(wakeFd, &value, sizeof(value));
		if (readBytes == static_cast<ssize_t>(sizeof(value))) {
			continue;
		}
		if (readBytes < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
			return;
		}
		if (readBytes < 0 && errno == EINTR) {
			continue;
		}
		return;
	}
}

bool ServerOs::updateClientEvents(const SP<Socket> &socket)
{
	if (!socket || !socket->SocketOs::state) {
		return false;
	}

	SocketOs::State &state = *socket->SocketOs::state;
	if (state.fd < 0 || state.closed) {
		return false;
	}

	epoll_event event{};
	event.events = EPOLLIN | EPOLLRDHUP;
	if (!state.pendingWrite.empty()) {
		event.events |= EPOLLOUT;
	}
	event.data.fd = state.fd;

	return ::epoll_ctl(epollFd, EPOLL_CTL_MOD, state.fd, &event) == 0;
}

void ServerOs::queueClose(const SP<Socket> &socket, std::optional<string> error)
{
	if (!socket || !socket->SocketOs::state) {
		return;
	}

	SocketOs::State &state = *socket->SocketOs::state;
	if (state.closeQueued || state.closed) {
		return;
	}

	state.closeQueued = true;
	state.closeError = std::move(error);
}

void ServerOs::flushSocketOutput(const SP<Socket> &socket)
{
	if (!socket || !socket->SocketOs::state) {
		return;
	}

	SocketOs::State &state = *socket->SocketOs::state;
	if (state.closed || state.fd < 0 || state.pendingWrite.empty()) {
		updateClientEvents(socket);
		return;
	}

	while (!state.pendingWrite.empty()) {
		const uint8_t *ptr = reinterpret_cast<const uint8_t *>(state.pendingWrite.data());
		const size_t size = state.pendingWrite.size();
		const ssize_t sent = ::send(state.fd, ptr, size, MSG_NOSIGNAL);
		if (sent > 0) {
			state.pendingWrite.erase(0, static_cast<size_t>(sent));
			continue;
		}

		if (sent < 0 && errno == EINTR) {
			continue;
		}

		if (sent < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
			break;
		}

		queueClose(socket, errnoToString("socket send failed"));
		break;
	}

	updateClientEvents(socket);
}

void ServerOs::finalizeQueuedCloses(const SP<ServerListener> &listenerSp)
{
	for (auto it = sockets.begin(); it != sockets.end();) {
		SP<Socket> socket = it->second;
		if (!socket || !socket->SocketOs::state) {
			const int fd = it->first;
			it = sockets.erase(it);
			if (fd >= 0) {
				::close(fd);
			}
			continue;
		}

		SocketOs::State &state = *socket->SocketOs::state;
		if (!state.closeQueued || state.closed) {
			++it;
			continue;
		}

		if (state.fd >= 0) {
			::epoll_ctl(epollFd, EPOLL_CTL_DEL, state.fd, nullptr);
			::close(state.fd);
			state.fd = -1;
		}

		state.closed = true;
		state.closeQueued = false;

		if (!state.closeNotified && listenerSp) {
			state.closeNotified = true;
			const string *errorPtr = state.closeError ? &(*state.closeError) : nullptr;
			listenerSp->onClosed(socket, errorPtr);
		}

		it = sockets.erase(it);
	}
}

bool ServerOs::shutdownServer()
{
	if (!started) {
		return false;
	}

	SP<ServerListener> listenerSp = listener.lock();

	for (auto &entry : sockets) {
		queueClose(entry.second, std::nullopt);
	}
	finalizeQueuedCloses(listenerSp);

	if (listenFd >= 0) {
		::epoll_ctl(epollFd, EPOLL_CTL_DEL, listenFd, nullptr);
		::close(listenFd);
		listenFd = -1;
	}

	if (wakeFd >= 0) {
		::epoll_ctl(epollFd, EPOLL_CTL_DEL, wakeFd, nullptr);
		::close(wakeFd);
		wakeFd = -1;
	}

	if (epollFd >= 0) {
		::close(epollFd);
		epollFd = -1;
	}

	started = false;

	if (!stopNotified && listenerSp) {
		stopNotified = true;
		listenerSp->onStop();
	}

	return false;
}

bool ServerOs::setupListener()
{
	const auto parsed = parseBindSpec(bindSpec);
	if (!parsed) {
		return false;
	}

	const string host = parsed->first;
	const string port = parsed->second;

	addrinfo hints{};
	hints.ai_family = AF_UNSPEC;
	hints.ai_socktype = SOCK_STREAM;
	hints.ai_flags = AI_PASSIVE;

	addrinfo *result = nullptr;
	const char *node = host.empty() ? nullptr : host.c_str();
	if (::getaddrinfo(node, port.c_str(), &hints, &result) != 0) {
		return false;
	}

	int created_fd = -1;
	for (addrinfo *it = result; it != nullptr; it = it->ai_next) {
		const int fd = ::socket(it->ai_family, it->ai_socktype, it->ai_protocol);
		if (fd < 0) {
			continue;
		}

		int one = 1;
		(void)::setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));

		if (setNonBlocking(fd) < 0) {
			::close(fd);
			continue;
		}

		if (::bind(fd, it->ai_addr, it->ai_addrlen) < 0) {
			::close(fd);
			continue;
		}

		if (::listen(fd, SOMAXCONN) < 0) {
			::close(fd);
			continue;
		}

		created_fd = fd;
		break;
	}

	::freeaddrinfo(result);

	if (created_fd < 0) {
		return false;
	}

	listenFd = created_fd;
	return true;
}

bool ServerOs::setupEpoll()
{
	epollFd = ::epoll_create1(EPOLL_CLOEXEC);
	if (epollFd < 0) {
		return false;
	}

	wakeFd = ::eventfd(0, EFD_NONBLOCK | EFD_CLOEXEC);
	if (wakeFd < 0) {
		return false;
	}

	epoll_event listener_event{};
	listener_event.events = EPOLLIN;
	listener_event.data.fd = listenFd;
	if (::epoll_ctl(epollFd, EPOLL_CTL_ADD, listenFd, &listener_event) < 0) {
		return false;
	}

	epoll_event wake_event{};
	wake_event.events = EPOLLIN;
	wake_event.data.fd = wakeFd;
	if (::epoll_ctl(epollFd, EPOLL_CTL_ADD, wakeFd, &wake_event) < 0) {
		return false;
	}

	return true;
}

void ServerOs::acceptNewConnections(const SP<ServerListener> &listenerSp)
{
	while (true) {
		const int clientFd = ::accept4(listenFd, nullptr, nullptr, SOCK_NONBLOCK | SOCK_CLOEXEC);
		if (clientFd >= 0) {
			epoll_event client_event{};
			client_event.events = EPOLLIN | EPOLLRDHUP;
			client_event.data.fd = clientFd;
			if (::epoll_ctl(epollFd, EPOLL_CTL_ADD, clientFd, &client_event) < 0) {
				::close(clientFd);
				continue;
			}

			SP<Socket> socketSp(new Socket());
			socketSp->SocketOs::state = SP<SocketOs::State>(new SocketOs::State(this, clientFd));
			sockets.emplace(clientFd, socketSp);

			if (listenerSp) {
				listenerSp->onConnected(socketSp);
			}
			continue;
		}

		if (errno == EINTR) {
			continue;
		}
		if (errno == EAGAIN || errno == EWOULDBLOCK) {
			return;
		}
		return;
	}
}

bool ServerOs::start()
{
	if (started) {
		return false;
	}

	if (!setupListener()) {
		cleanupFds();
		return false;
	}

	if (!setupEpoll()) {
		cleanupFds();
		return false;
	}

	stopRequested = 0;
	stopNotified = false;
	started = true;
	return true;
}

bool ServerOs::poll(int timeoutMs)
{
	if (!started) {
		return false;
	}

	SP<ServerListener> listenerSp = listener.lock();
	if (!listenerSp) {
		requestStop();
		return shutdownServer();
	}

	if (isStopRequested()) {
		return shutdownServer();
	}

	const auto deadline = (timeoutMs < 0)
		? std::chrono::steady_clock::time_point::max()
		: (std::chrono::steady_clock::now() + std::chrono::milliseconds(timeoutMs));

	epoll_event events[kMaxEvents];

	while (true) {
		if (isStopRequested()) {
			return shutdownServer();
		}

		int waitTimeoutMs = -1;
		if (timeoutMs >= 0) {
			const auto now = std::chrono::steady_clock::now();
			if (now >= deadline) {
				break;
			}
			const auto remaining = std::chrono::duration_cast<std::chrono::milliseconds>(deadline - now).count();
			waitTimeoutMs = clampEpollTimeoutMs(remaining);
		}

		const int ready = ::epoll_wait(epollFd, events, kMaxEvents, waitTimeoutMs);
		if (ready < 0) {
			if (errno == EINTR) {
				if (isStopRequested()) {
					return shutdownServer();
				}
				continue;
			}
			requestStop();
			return shutdownServer();
		}

		if (ready == 0) {
			break;
		}

		listenerSp = listener.lock();
		if (!listenerSp) {
			requestStop();
			return shutdownServer();
		}

		for (int i = 0; i < ready; ++i) {
			const epoll_event &event = events[i];
			const int fd = event.data.fd;

			if (fd == wakeFd) {
				consumeWakeFd();
				continue;
			}

			if (fd == listenFd) {
				acceptNewConnections(listenerSp);
				continue;
			}

			auto it = sockets.find(fd);
			if (it == sockets.end()) {
				continue;
			}

			SP<Socket> socket = it->second;
			if (!socket || !socket->SocketOs::state) {
				continue;
			}

			if ((event.events & (EPOLLERR | EPOLLHUP)) != 0) {
				queueClose(socket, string("socket error/hangup"));
			}

			if ((event.events & EPOLLRDHUP) != 0) {
				queueClose(socket, std::nullopt);
			}

			if ((event.events & EPOLLIN) != 0) {
				listenerSp->onData(socket);
			}

			if ((event.events & EPOLLOUT) != 0) {
				flushSocketOutput(socket);
			}
		}

		finalizeQueuedCloses(listenerSp);

		if (timeoutMs >= 0 && std::chrono::steady_clock::now() >= deadline) {
			break;
		}
	}

	listenerSp = listener.lock();
	finalizeQueuedCloses(listenerSp);

	if (isStopRequested()) {
		return shutdownServer();
	}

	return true;
}

void ServerOs::stop()
{
	requestStop();
	wakePoller();
}

size_t SocketOs::read(uint8_t *buffer, size_t length)
{
	if (!state || state->closed || state->fd < 0) {
		return 0;
	}

	if (length == 0) {
		return 0;
	}

	while (true) {
		const ssize_t n = ::recv(state->fd, buffer, length, 0);
		if (n > 0) {
			return static_cast<size_t>(n);
		}
		if (n == 0) {
			if (state->owner) {
				auto it = state->owner->sockets.find(state->fd);
				if (it != state->owner->sockets.end()) {
					state->owner->queueClose(it->second, std::nullopt);
				}
			}
			return 0;
		}
		if (errno == EINTR) {
			continue;
		}
		if (errno == EAGAIN || errno == EWOULDBLOCK) {
			return 0;
		}
		if (state->owner) {
			auto it = state->owner->sockets.find(state->fd);
			if (it != state->owner->sockets.end()) {
				state->owner->queueClose(it->second, errnoToString("socket recv failed"));
			}
		}
		return 0;
	}
}

size_t SocketOs::write(const uint8_t *buffer, size_t length)
{
	if (!state || state->closed || state->fd < 0) {
		return 0;
	}

	if (length == 0) {
		return state->pendingWrite.size();
	}

	state->pendingWrite.append(buffer, length);

	if (state->owner) {
		auto it = state->owner->sockets.find(state->fd);
		if (it != state->owner->sockets.end()) {
			state->owner->flushSocketOutput(it->second);
		}
	}

	if (state->closed) {
		return 0;
	}

	return state->pendingWrite.size();
}

void SocketOs::close()
{
	if (!state || state->closed || state->fd < 0 || !state->owner) {
		return;
	}

	auto it = state->owner->sockets.find(state->fd);
	if (it == state->owner->sockets.end()) {
		return;
	}

	state->owner->queueClose(it->second, std::nullopt);
}

void SocketOs::error(const string &message)
{
	if (!state || state->closed || state->fd < 0 || !state->owner) {
		return;
	}

	auto it = state->owner->sockets.find(state->fd);
	if (it == state->owner->sockets.end()) {
		return;
	}

	state->owner->queueClose(it->second, message);
}

#endif // defined(__linux__) || defined(__unix__) || (defined(__APPLE__) && defined(__MACH__))
