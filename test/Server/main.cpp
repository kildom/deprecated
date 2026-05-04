#include <chrono>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <map>
#include <memory>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#include "../../src/Server.hpp"

namespace {

constexpr const char *kEchoMessage = "ping from client";
constexpr const char *kGreetingMessage = "hello from server";
constexpr const char *kChunkedMessage = "ABCDEFGHIJ";
constexpr const char *kCloseMessage = "close-me";
constexpr const char *kMultiReplyPrefix = "ack:";

enum class ScenarioKind {
	EchoBasic,
	GreetingOnConnect,
	ChunkedReadEcho,
	ServerInitiatedClose,
	MultiClientEcho,
};

struct ScenarioMetadata {
	ScenarioKind kind;
	const char *name;
	const char *description;
	std::vector<string> platforms;
};

struct EventRecord {
	string type;
	std::map<string, string> fields;
};

struct ResultDocument {
	string scenario;
	string platform;
	string status;
	string message;
	std::map<string, long long> numbers;
	std::map<string, string> strings;
	std::map<string, std::vector<long long>> numberLists;
	std::map<string, std::vector<string>> stringLists;
	std::vector<EventRecord> events;
};

string platformName()
{
#if defined(_WIN32) || defined(_WIN64)
	return "windows";
#elif defined(__APPLE__) && defined(__MACH__)
	return "macos";
#elif defined(__linux__)
	return "linux";
#else
	return "unknown";
#endif
}

const std::vector<ScenarioMetadata> &scenarioCatalog()
{
	static const std::vector<ScenarioMetadata> catalog = {
		{ScenarioKind::EchoBasic, "echo_basic", "Echo one payload back to a single client", {"linux", "windows"}},
		{ScenarioKind::GreetingOnConnect, "greeting_on_connect", "Send data from server immediately after connect", {"linux", "windows"}},
		{ScenarioKind::ChunkedReadEcho, "chunked_read_echo", "Exercise repeated onData calls with partial reads", {"linux", "windows"}},
		{ScenarioKind::ServerInitiatedClose, "server_initiated_close", "Close a client socket from the server side", {"linux", "windows"}},
		{ScenarioKind::MultiClientEcho, "multi_client_echo", "Serve two clients in the same scenario", {"linux", "windows"}},
	};
	return catalog;
}

const ScenarioMetadata *findScenario(const string &name)
{
	for (const ScenarioMetadata &metadata : scenarioCatalog()) {
		if (metadata.name == name) {
			return &metadata;
		}
	}
	return nullptr;
}

string jsonEscape(const string &value)
{
	std::ostringstream stream;
	for (unsigned char ch : value) {
		switch (ch) {
		case '\\':
			stream << "\\\\";
			break;
		case '"':
			stream << "\\\"";
			break;
		case '\b':
			stream << "\\b";
			break;
		case '\f':
			stream << "\\f";
			break;
		case '\n':
			stream << "\\n";
			break;
		case '\r':
			stream << "\\r";
			break;
		case '\t':
			stream << "\\t";
			break;
		default:
			if (ch < 0x20) {
				stream << "\\u";
				const char digits[] = "0123456789abcdef";
				stream << '0' << '0' << digits[(ch >> 4) & 0x0f] << digits[ch & 0x0f];
			} else {
				stream << static_cast<char>(ch);
			}
			break;
		}
	}
	return stream.str();
}

bytes toBytes(const string &text)
{
	bytes result;
	result.assign(reinterpret_cast<const uint8_t *>(text.data()), reinterpret_cast<const uint8_t *>(text.data()) + text.size());
	return result;
}

string bytesToString(const bytes &data, int length)
{
	return string(reinterpret_cast<const char *>(data.data()), static_cast<size_t>(length));
}

void appendQuoted(std::ostringstream &stream, const string &value)
{
	stream << '"' << jsonEscape(value) << '"';
}

string resultToJson(const ResultDocument &document)
{
	std::ostringstream stream;
	stream << "{";
	stream << "\"scenario\":";
	appendQuoted(stream, document.scenario);
	stream << ",\"platform\":";
	appendQuoted(stream, document.platform);
	stream << ",\"status\":";
	appendQuoted(stream, document.status);
	stream << ",\"message\":";
	appendQuoted(stream, document.message);

	stream << ",\"numbers\":{";
	bool first = true;
	for (const auto &entry : document.numbers) {
		if (!first) {
			stream << ',';
		}
		first = false;
		appendQuoted(stream, entry.first);
		stream << ':' << entry.second;
	}
	stream << '}';

	stream << ",\"strings\":{";
	first = true;
	for (const auto &entry : document.strings) {
		if (!first) {
			stream << ',';
		}
		first = false;
		appendQuoted(stream, entry.first);
		stream << ':';
		appendQuoted(stream, entry.second);
	}
	stream << '}';

	stream << ",\"number_lists\":{";
	first = true;
	for (const auto &entry : document.numberLists) {
		if (!first) {
			stream << ',';
		}
		first = false;
		appendQuoted(stream, entry.first);
		stream << ":[";
		for (size_t index = 0; index < entry.second.size(); ++index) {
			if (index != 0) {
				stream << ',';
			}
			stream << entry.second[index];
		}
		stream << ']';
	}
	stream << '}';

	stream << ",\"string_lists\":{";
	first = true;
	for (const auto &entry : document.stringLists) {
		if (!first) {
			stream << ',';
		}
		first = false;
		appendQuoted(stream, entry.first);
		stream << ":[";
		for (size_t index = 0; index < entry.second.size(); ++index) {
			if (index != 0) {
				stream << ',';
			}
			appendQuoted(stream, entry.second[index]);
		}
		stream << ']';
	}
	stream << '}';

	stream << ",\"events\":[";
	for (size_t index = 0; index < document.events.size(); ++index) {
		if (index != 0) {
			stream << ',';
		}
		const EventRecord &event = document.events[index];
		stream << '{';
		stream << "\"type\":";
		appendQuoted(stream, event.type);
		for (const auto &entry : event.fields) {
			stream << ',';
			appendQuoted(stream, entry.first);
			stream << ':';
			appendQuoted(stream, entry.second);
		}
		stream << '}';
	}
	stream << ']';
	stream << '}';
	return stream.str();
}

bool writeJsonFile(const string &path, const string &json)
{
	std::ofstream output(path);
	if (!output) {
		return false;
	}
	output << json << '\n';
	return static_cast<bool>(output);
}

string scenarioListJson()
{
	std::ostringstream stream;
	stream << "{";
	stream << "\"platform\":";
	appendQuoted(stream, platformName());
	stream << ",\"scenarios\":[";
	const auto &catalog = scenarioCatalog();
	for (size_t index = 0; index < catalog.size(); ++index) {
		if (index != 0) {
			stream << ',';
		}
		const ScenarioMetadata &metadata = catalog[index];
		stream << '{';
		stream << "\"name\":";
		appendQuoted(stream, metadata.name);
		stream << ",\"description\":";
		appendQuoted(stream, metadata.description);
		stream << ",\"platforms\":[";
		for (size_t platformIndex = 0; platformIndex < metadata.platforms.size(); ++platformIndex) {
			if (platformIndex != 0) {
				stream << ',';
			}
			appendQuoted(stream, metadata.platforms[platformIndex]);
		}
		stream << "]}";
	}
	stream << "]}";
	return stream.str();
}

class ScenarioListenerImpl : public ServerListener {
public:
	explicit ScenarioListenerImpl(ScenarioKind kind)
		: kind(kind)
	{
		document.scenario = scenarioName(kind);
		document.platform = platformName();
		document.status = "running";
		document.message = "scenario is running";
	}

	void onConnected(const SP<Socket> &socket) override
	{
		const int connectionId = idFor(socket);
		++connectedCount;
		logEvent("connected", {{"connection", std::to_string(connectionId)}});

		if (kind == ScenarioKind::GreetingOnConnect) {
			if (!writeText(socket, kGreetingMessage)) {
				return;
			}
			greetingSent = true;
			document.strings["sent_greeting"] = kGreetingMessage;
		}

		if (kind == ScenarioKind::MultiClientEcho && connectedCount > 2) {
			fail("expected exactly two clients");
		}
	}

	void onData(const SP<Socket> &socket) override
	{
		++dataCallbackCount;
		const int connectionId = idFor(socket);

		switch (kind) {
		case ScenarioKind::EchoBasic:
			if (!readAllAvailable(socket, connectionId)) {
				return;
			}
			if (!receivedByConnection[connectionId].empty() && echoedConnections.count(connectionId) == 0) {
				if (!writeText(socket, receivedByConnection[connectionId])) {
					return;
				}
				echoedConnections.insert(connectionId);
				logEvent("echoed", {{"connection", std::to_string(connectionId)}, {"payload", receivedByConnection[connectionId]}});
			}
			break;
		case ScenarioKind::GreetingOnConnect:
			if (!readAllAvailable(socket, connectionId)) {
				return;
			}
			if (!receivedByConnection[connectionId].empty()) {
				fail("greeting scenario should not receive client data");
			}
			break;
		case ScenarioKind::ChunkedReadEcho:
			if (!readSingleChunk(socket, connectionId, 3)) {
				return;
			}
			if (receivedByConnection[connectionId] == kChunkedMessage && echoedConnections.count(connectionId) == 0) {
				if (!writeText(socket, kChunkedMessage)) {
					return;
				}
				echoedConnections.insert(connectionId);
				logEvent("echoed", {{"connection", std::to_string(connectionId)}, {"payload", kChunkedMessage}});
			}
			break;
		case ScenarioKind::ServerInitiatedClose:
			if (!readAllAvailable(socket, connectionId)) {
				return;
			}
			if (receivedByConnection[connectionId] == kCloseMessage && !serverCloseIssued) {
				serverCloseIssued = true;
				logEvent("server_close_requested", {{"connection", std::to_string(connectionId)}});
				socket->close();
			}
			break;
		case ScenarioKind::MultiClientEcho:
			if (!readAllAvailable(socket, connectionId)) {
				return;
			}
			if (receivedByConnection[connectionId].empty()) {
				break;
			}
			if (echoedConnections.count(connectionId) == 0) {
				const string reply = string(kMultiReplyPrefix) + receivedByConnection[connectionId];
				if (!writeText(socket, reply)) {
					return;
				}
				echoedConnections.insert(connectionId);
				logEvent("echoed", {{"connection", std::to_string(connectionId)}, {"payload", reply}});
			}
			break;
		}

		checkCompletion();
	}

	void onClosed(const SP<Socket> &socket, const string *errorMessage) override
	{
		const int connectionId = idFor(socket);
		++closedCount;
		closedConnections.insert(connectionId);
		logEvent(
			"closed",
			{{"connection", std::to_string(connectionId)}, {"error", errorMessage ? *errorMessage : string()}}
		);

		if (errorMessage != nullptr) {
			fail(string("unexpected socket close error: ") + *errorMessage);
			return;
		}

		checkCompletion();
	}

	void onStop() override
	{
		stopObserved = true;
		logEvent("stopped", {});
	}

	bool shouldStop() const
	{
		return stopRequested;
	}

	bool isFinished() const
	{
		return finished;
	}

	void failFromTimeout(const string &message)
	{
		fail(message);
	}

	ResultDocument buildDocument() const
	{
		ResultDocument snapshot = document;
		snapshot.numbers["connections"] = connectedCount;
		snapshot.numbers["data_callbacks"] = dataCallbackCount;
		snapshot.numbers["closed_callbacks"] = closedCount;
		snapshot.numbers["server_stopped"] = stopObserved ? 1 : 0;
		snapshot.numberLists["chunk_sizes"] = chunkSizes;

		for (const auto &entry : receivedByConnection) {
			snapshot.stringLists["received_payloads"].push_back(entry.second);
		}
		for (const auto &entry : closedConnections) {
			snapshot.numberLists["closed_connections"].push_back(entry);
		}
		return snapshot;
	}

	int exitCode() const
	{
		return document.status == "passed" ? 0 : 1;
	}

private:
	static string scenarioName(ScenarioKind kind)
	{
		for (const ScenarioMetadata &metadata : scenarioCatalog()) {
			if (metadata.kind == kind) {
				return metadata.name;
			}
		}
		return "unknown";
	}

	int idFor(const SP<Socket> &socket)
	{
		auto it = socketIds.find(socket);
		if (it != socketIds.end()) {
			return it->second;
		}
		const int assignedId = nextSocketId++;
		socketIds.emplace(socket, assignedId);
		return assignedId;
	}

	bool readAllAvailable(const SP<Socket> &socket, int connectionId)
	{
		while (true) {
			bytes buffer;
			buffer.resize(64);
			const int readBytes = socket->read(buffer, 0, -1);
			if (readBytes < 0) {
				fail("socket read failed");
				return false;
			}
			if (readBytes == 0) {
				return true;
			}
			const string chunk = bytesToString(buffer, readBytes);
			receivedByConnection[connectionId] += chunk;
			logEvent("data", {{"connection", std::to_string(connectionId)}, {"chunk", chunk}});
		}
	}

	bool readSingleChunk(const SP<Socket> &socket, int connectionId, int chunkSize)
	{
		bytes buffer;
		buffer.resize(static_cast<size_t>(chunkSize));
		const int readBytes = socket->read(buffer, 0, chunkSize);
		if (readBytes < 0) {
			fail("socket read failed");
			return false;
		}
		if (readBytes == 0) {
			return true;
		}
		const string chunk = bytesToString(buffer, readBytes);
		chunkSizes.push_back(readBytes);
		receivedByConnection[connectionId] += chunk;
		logEvent("data", {{"connection", std::to_string(connectionId)}, {"chunk", chunk}});
		return true;
	}

	bool writeText(const SP<Socket> &socket, const string &text)
	{
		const int bufferedBytes = socket->write(toBytes(text));
		if (bufferedBytes < 0) {
			fail("socket write failed");
			return false;
		}
		return true;
	}

	void checkCompletion()
	{
		if (finished) {
			return;
		}

		switch (kind) {
		case ScenarioKind::EchoBasic:
			if (connectedCount == 1 && echoedConnections.size() == 1 && closedCount == 1) {
				pass("basic echo completed");
			}
			break;
		case ScenarioKind::GreetingOnConnect:
			if (connectedCount == 1 && greetingSent && closedCount == 1) {
				pass("server greeting completed");
			}
			break;
		case ScenarioKind::ChunkedReadEcho:
			if (connectedCount == 1 && echoedConnections.size() == 1 && closedCount == 1 && chunkSizes.size() > 1) {
				pass("chunked read echo completed");
			}
			break;
		case ScenarioKind::ServerInitiatedClose:
			if (connectedCount == 1 && serverCloseIssued && closedCount == 1) {
				pass("server initiated close completed");
			}
			break;
		case ScenarioKind::MultiClientEcho:
			if (connectedCount == 2 && echoedConnections.size() == 2 && closedCount == 2) {
				pass("multi client echo completed");
			}
			break;
		}
	}

	void pass(const string &message)
	{
		finished = true;
		stopRequested = true;
		document.status = "passed";
		document.message = message;
	}

	void fail(const string &message)
	{
		if (finished && document.status == "failed") {
			return;
		}
		finished = true;
		stopRequested = true;
		document.status = "failed";
		document.message = message;
	}

	void logEvent(const string &type, std::map<string, string> fields)
	{
		document.events.push_back(EventRecord{type, std::move(fields)});
	}

	ScenarioKind kind;
	ResultDocument document;
	std::map<SP<Socket>, int, std::owner_less<SP<Socket>>> socketIds;
	std::map<int, string> receivedByConnection;
	std::set<int> echoedConnections;
	std::set<int> closedConnections;
	std::vector<long long> chunkSizes;
	int nextSocketId = 1;
	int connectedCount = 0;
	int dataCallbackCount = 0;
	int closedCount = 0;
	bool greetingSent = false;
	bool serverCloseIssued = false;
	bool stopObserved = false;
	bool stopRequested = false;
	bool finished = false;
};

struct Options {
	bool listScenarios = false;
	const ScenarioMetadata *scenario = nullptr;
	string bindSpec;
	string resultPath;
	int timeoutMs = 3000;
};

bool parseInt(const string &value, int &parsed)
{
	std::istringstream stream(value);
	stream >> parsed;
	return stream && stream.eof();
}

bool parseOptions(int argc, char **argv, Options &options, string &error)
{
	for (int index = 1; index < argc; ++index) {
		const string arg = argv[index];
		if (arg == "--list-scenarios") {
			options.listScenarios = true;
			continue;
		}
		if (index + 1 >= argc) {
			error = string("missing value for ") + arg;
			return false;
		}
		const string value = argv[++index];
		if (arg == "--scenario") {
			options.scenario = findScenario(value);
			if (options.scenario == nullptr) {
				error = string("unknown scenario: ") + value;
				return false;
			}
		} else if (arg == "--bind") {
			options.bindSpec = value;
		} else if (arg == "--result") {
			options.resultPath = value;
		} else if (arg == "--timeout-ms") {
			if (!parseInt(value, options.timeoutMs) || options.timeoutMs <= 0) {
				error = "timeout must be a positive integer";
				return false;
			}
		} else {
			error = string("unknown argument: ") + arg;
			return false;
		}
	}

	if (!options.listScenarios) {
		if (options.scenario == nullptr) {
			error = "--scenario is required";
			return false;
		}
		if (options.bindSpec.empty()) {
			error = "--bind is required";
			return false;
		}
		if (options.resultPath.empty()) {
			error = "--result is required";
			return false;
		}
	}

	return true;
}

int runScenario(const Options &options)
{
	SP<ScenarioListenerImpl> listener(new ScenarioListenerImpl(options.scenario->kind));
	SP<ServerListener> serverListener = std::static_pointer_cast<ServerListener>(listener);
	Server server(options.bindSpec, serverListener);

	if (!server.start()) {
		ResultDocument document;
		document.scenario = options.scenario->name;
		document.platform = platformName();
		document.status = "failed";
		document.message = "server start failed";
		const string json = resultToJson(document);
		if (!writeJsonFile(options.resultPath, json)) {
			std::cerr << "failed to write result file\n";
		}
		return 1;
	}

	const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(options.timeoutMs);
	bool running = true;
	while (running) {
		if (listener->shouldStop()) {
			server.stop();
		}

		running = server.poll(50);

		if (!running) {
			break;
		}

		if (listener->isFinished()) {
			server.stop();
			continue;
		}

		if (std::chrono::steady_clock::now() >= deadline) {
			listener->failFromTimeout("timed out waiting for scenario completion");
			server.stop();
		}
	}

	ResultDocument document = listener->buildDocument();
	const string json = resultToJson(document);
	if (!writeJsonFile(options.resultPath, json)) {
		std::cerr << "failed to write result file\n";
		return 1;
	}
	return listener->exitCode();
}

} // namespace

int main(int argc, char **argv)
{
	Options options;
	string error;
	if (!parseOptions(argc, argv, options, error)) {
		std::cerr << error << '\n';
		return 2;
	}

	if (options.listScenarios) {
		std::cout << scenarioListJson() << '\n';
		return 0;
	}

	return runScenario(options);
}
