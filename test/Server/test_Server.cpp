#include "test_Server.hpp"

#include <set>
#include <vector>

namespace {

constexpr const char *kGreetingMessage  = "hello from server";
constexpr const char *kChunkedMessage   = "ABCDEFGHIJ";
constexpr const char *kCloseMessage     = "close-me";
constexpr const char *kMultiReplyPrefix = "ack:";

enum class ServerScenarioKind {
	EchoBasic,
	GreetingOnConnect,
	ChunkedReadEcho,
	ServerInitiatedClose,
	MultiClientEcho,
};

// ─── ServerScenarioListener ───────────────────────────────────────────────────

class ServerScenarioListener : public BaseScenarioListener {
public:
	explicit ServerScenarioListener(ServerScenarioKind kind, const string &scenarioName)
		: BaseScenarioListener(scenarioName), kind(kind)
	{}

	void onConnected(const SP<Socket> &socket) override
	{
		const int id = idFor(socket);
		++connectedCount;
		logEvent("connected", {{"connection", std::to_string(id)}});

		if (kind == ServerScenarioKind::GreetingOnConnect) {
			writeText(socket, kGreetingMessage);
			greetingSent = true;
			document.strings["sent_greeting"] = kGreetingMessage;
		}

		if (kind == ServerScenarioKind::MultiClientEcho && connectedCount > 2) {
			fail("expected exactly two clients");
		}
	}

	void onData(const SP<Socket> &socket) override
	{
		++dataCallbackCount;
		const int id = idFor(socket);

		switch (kind) {
		case ServerScenarioKind::EchoBasic:
			readAllAvailable(socket, id);
			if (!receivedByConn[id].empty() && echoedConnections.count(id) == 0) {
				writeText(socket, receivedByConn[id]);
				echoedConnections.insert(id);
				logEvent("echoed", {{"connection", std::to_string(id)}, {"payload", receivedByConn[id]}});
			}
			break;

		case ServerScenarioKind::GreetingOnConnect:
			readAllAvailable(socket, id);
			if (!receivedByConn[id].empty())
				fail("greeting scenario should not receive client data");
			break;

		case ServerScenarioKind::ChunkedReadEcho:
			readSingleChunk(socket, id, 3);
			if (receivedByConn[id] == kChunkedMessage && echoedConnections.count(id) == 0) {
				writeText(socket, kChunkedMessage);
				echoedConnections.insert(id);
				logEvent("echoed", {{"connection", std::to_string(id)}, {"payload", kChunkedMessage}});
			}
			break;

		case ServerScenarioKind::ServerInitiatedClose:
			readAllAvailable(socket, id);
			if (receivedByConn[id] == kCloseMessage && !serverCloseIssued) {
				serverCloseIssued = true;
				logEvent("server_close_requested", {{"connection", std::to_string(id)}});
				socket->close();
			}
			break;

		case ServerScenarioKind::MultiClientEcho:
			readAllAvailable(socket, id);
			if (!receivedByConn[id].empty() && echoedConnections.count(id) == 0) {
				const string reply = string(kMultiReplyPrefix) + receivedByConn[id];
				writeText(socket, reply);
				echoedConnections.insert(id);
				logEvent("echoed", {{"connection", std::to_string(id)}, {"payload", reply}});
			}
			break;
		}

		checkCompletion();
	}

	ResultDocument buildDocument() const override
	{
		ResultDocument snap = BaseScenarioListener::buildDocument();
		for (const auto &e : receivedByConn)
			snap.stringLists["received_payloads"].push_back(e.second);
		snap.numberLists["chunk_sizes"] = chunkSizes;
		return snap;
	}

protected:
	void onSocketClosed(const SP<Socket> &, int) override { checkCompletion(); }

private:
	ServerScenarioKind kind;
	std::map<int, string> receivedByConn;
	std::set<int> echoedConnections;
	std::vector<long long> chunkSizes;
	bool greetingSent    = false;
	bool serverCloseIssued = false;

	void readAllAvailable(const SP<Socket> &socket, int id)
	{
		while (true) {
			uint8_t buffer[64];
			const size_t n = socket->read(buffer, sizeof(buffer));
			if (n == 0) return;
			const string chunk(reinterpret_cast<const char *>(buffer), n);
			receivedByConn[id] += chunk;
			logEvent("data", {{"connection", std::to_string(id)}, {"chunk", chunk}});
		}
	}

	void readSingleChunk(const SP<Socket> &socket, int id, size_t chunkSize)
	{
		std::vector<uint8_t> buffer(chunkSize);
		const size_t n = socket->read(buffer.data(), chunkSize);
		if (n == 0) return;
		const string chunk(reinterpret_cast<const char *>(buffer.data()), n);
		chunkSizes.push_back(static_cast<long long>(n));
		receivedByConn[id] += chunk;
		logEvent("data", {{"connection", std::to_string(id)}, {"chunk", chunk}});
	}

	void writeText(const SP<Socket> &socket, const string &text)
	{
		socket->write(reinterpret_cast<const uint8_t *>(text.data()), text.size());
	}

	void checkCompletion()
	{
		if (finished) return;
		switch (kind) {
		case ServerScenarioKind::EchoBasic:
			if (connectedCount == 1 && echoedConnections.size() == 1 && closedCount == 1)
				pass("basic echo completed");
			break;
		case ServerScenarioKind::GreetingOnConnect:
			if (connectedCount == 1 && greetingSent && closedCount == 1)
				pass("server greeting completed");
			break;
		case ServerScenarioKind::ChunkedReadEcho:
			if (connectedCount == 1 && echoedConnections.size() == 1 && closedCount == 1 && chunkSizes.size() > 1)
				pass("chunked read echo completed");
			break;
		case ServerScenarioKind::ServerInitiatedClose:
			if (connectedCount == 1 && serverCloseIssued && closedCount == 1)
				pass("server initiated close completed");
			break;
		case ServerScenarioKind::MultiClientEcho:
			if (connectedCount == 2 && echoedConnections.size() == 2 && closedCount == 2)
				pass("multi client echo completed");
			break;
		}
	}
};

SP<ScenarioListenerBase> makeServerListener(ServerScenarioKind kind, const char *name)
{
	return SP<ScenarioListenerBase>(new ServerScenarioListener(kind, name));
}

} // namespace

const std::vector<ScenarioInfo> &serverScenarios()
{
	static const std::vector<ScenarioInfo> catalog = {
		{
			"echo_basic",
			"Echo one payload back to a single client",
			{"linux", "windows"},
			[] { return makeServerListener(ServerScenarioKind::EchoBasic, "echo_basic"); }
		},
		{
			"greeting_on_connect",
			"Send data from server immediately after connect",
			{"linux", "windows"},
			[] { return makeServerListener(ServerScenarioKind::GreetingOnConnect, "greeting_on_connect"); }
		},
		{
			"chunked_read_echo",
			"Exercise repeated onData calls with partial reads",
			{"linux", "windows"},
			[] { return makeServerListener(ServerScenarioKind::ChunkedReadEcho, "chunked_read_echo"); }
		},
		{
			"server_initiated_close",
			"Close a client socket from the server side",
			{"linux", "windows"},
			[] { return makeServerListener(ServerScenarioKind::ServerInitiatedClose, "server_initiated_close"); }
		},
		{
			"multi_client_echo",
			"Serve two clients in the same scenario",
			{"linux", "windows"},
			[] { return makeServerListener(ServerScenarioKind::MultiClientEcho, "multi_client_echo"); }
		},
	};
	return catalog;
}
