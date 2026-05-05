#include "test_EncryptedSocket.hpp"

#include <cstring>
#include <set>

#include "../../src/EncryptedSocket.hpp"

namespace {

// Hardcoded test key - Python client uses the exact same bytes.
// bytes(range(1, 17)) in Python.
constexpr uint8_t kTestKey[16] = {
	0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
	0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10
};

constexpr int kMultiMessageCount = 3;

enum class EncryptedScenarioKind {
	EchoZeroKey,
	EchoWithKey,
	MultipleMessages,
	BadMarker,
	BadTag,
};

// ─── EncryptedScenarioListener ───────────────────────────────────────────────

class EncryptedScenarioListener : public BaseScenarioListener {
public:
	explicit EncryptedScenarioListener(EncryptedScenarioKind kind, const string &scenarioName)
		: BaseScenarioListener(scenarioName), kind(kind)
	{}

	void onConnected(const SP<Socket> &socket) override
	{
		const int id = idFor(socket);
		++connectedCount;
		logEvent("connected", {{"connection", std::to_string(id)}});

		auto enc = std::make_shared<EncryptedSocket>(socket);
		if (kind == EncryptedScenarioKind::EchoWithKey) {
			auto keyBuf = std::make_shared<bytes>(kTestKey, kTestKey + 16);
			enc->setKey(BytesView(keyBuf, 0, 16));
		}
		connections[id] = ConnState{std::move(enc), {}, 0};
	}

	void onData(const SP<Socket> &socket) override
	{
		++dataCallbackCount;
		const int id = idFor(socket);
		auto it = connections.find(id);
		if (it == connections.end()) return;

		ConnState &state = it->second;
		uint8_t *buf = nullptr;
		const size_t size = state.enc->read(buf);
		if (size == 0) return;  // incomplete message or error already queued

		const string msg(reinterpret_cast<const char *>(buf), size);
		state.received += msg;
		++state.msgCount;
		logEvent("data", {{"connection", std::to_string(id)}, {"msg", msg}});

		// Echo back
		auto msgBuf = std::make_shared<bytes>(buf, buf + size);
		state.enc->outputStart(size);
		state.enc->outputWrite(BytesView(msgBuf, 0, size));
		state.enc->outputFinish();
		echoedConnections.insert(id);
		logEvent("echoed", {{"connection", std::to_string(id)}, {"payload", msg}});

		checkCompletion();
	}

	ResultDocument buildDocument() const override
	{
		ResultDocument snap = BaseScenarioListener::buildDocument();
		for (const auto &e : connections)
			snap.stringLists["received_messages"].push_back(e.second.received);
		snap.numbers["echo_count"] = static_cast<long long>(echoedConnections.size());
		return snap;
	}

protected:
	void onSocketClosed(const SP<Socket> &, int) override
	{
		checkCompletion();
	}

	void onSocketError(const SP<Socket> &, int id, const string &error) override
	{
		if (kind == EncryptedScenarioKind::BadMarker || kind == EncryptedScenarioKind::BadTag) {
			logEvent("expected_error", {{"connection", std::to_string(id)}, {"error", error}});
			gotExpectedError = true;
			checkCompletion();
		} else {
			fail("unexpected socket close error: " + error);
		}
	}

private:
	struct ConnState {
		SP<EncryptedSocket> enc;
		string received;
		int msgCount = 0;
	};

	EncryptedScenarioKind kind;
	std::map<int, ConnState> connections;
	std::set<int> echoedConnections;
	bool gotExpectedError = false;

	void checkCompletion()
	{
		if (finished) return;
		switch (kind) {
		case EncryptedScenarioKind::EchoZeroKey:
		case EncryptedScenarioKind::EchoWithKey:
			if (connectedCount == 1 && echoedConnections.size() == 1 && closedCount == 1)
				pass("encrypted echo completed");
			break;

		case EncryptedScenarioKind::MultipleMessages: {
			auto it = connections.begin();
			if (connectedCount == 1 && closedCount == 1
				&& it != connections.end() && it->second.msgCount == kMultiMessageCount)
				pass("encrypted multiple messages completed");
			break;
		}

		case EncryptedScenarioKind::BadMarker:
		case EncryptedScenarioKind::BadTag:
			if (connectedCount == 1 && closedCount == 1 && gotExpectedError)
				pass("error correctly detected");
			break;
		}
	}
};

SP<ScenarioListenerBase> makeEncListener(EncryptedScenarioKind kind, const char *name)
{
	return SP<ScenarioListenerBase>(new EncryptedScenarioListener(kind, name));
}

} // namespace

const std::vector<ScenarioInfo> &encryptedSocketScenarios()
{
	static const std::vector<ScenarioInfo> catalog = {
		{
			"encrypted_echo",
			"Encrypt/decrypt one round-trip message with the default zero key",
			{"linux", "windows"},
			[] { return makeEncListener(EncryptedScenarioKind::EchoZeroKey, "encrypted_echo"); }
		},
		{
			"encrypted_echo_with_key",
			"Encrypt/decrypt one round-trip message with a non-zero key",
			{"linux", "windows"},
			[] { return makeEncListener(EncryptedScenarioKind::EchoWithKey, "encrypted_echo_with_key"); }
		},
		{
			"encrypted_multiple_messages",
			"Exchange multiple encrypted messages in sequence",
			{"linux", "windows"},
			[] { return makeEncListener(EncryptedScenarioKind::MultipleMessages, "encrypted_multiple_messages"); }
		},
		{
			"encrypted_bad_marker",
			"Server detects and rejects a message with an invalid begin marker",
			{"linux", "windows"},
			[] { return makeEncListener(EncryptedScenarioKind::BadMarker, "encrypted_bad_marker"); }
		},
		{
			"encrypted_bad_tag",
			"Server detects and rejects a message with a corrupted authentication tag",
			{"linux", "windows"},
			[] { return makeEncListener(EncryptedScenarioKind::BadTag, "encrypted_bad_tag"); }
		},
	};
	return catalog;
}
