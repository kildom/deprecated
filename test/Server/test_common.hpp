#pragma once

#include <any>
#include <fstream>
#include <functional>
#include <map>
#include <set>
#include <sstream>
#include <vector>

#include "../../src/Server.hpp"

// ─── Shared data types ────────────────────────────────────────────────────────

struct EventRecord {
	string type;
	std::map<string, string> fields;
};

struct ResultDocument {
	string scenario;
	string platform;
	string status = "running";
	string message = "scenario is running";
	std::map<string, long long> numbers;
	std::map<string, string> strings;
	std::map<string, std::vector<long long>> numberLists;
	std::map<string, std::vector<string>> stringLists;
	std::vector<EventRecord> events;
};

// ─── Abstract base ────────────────────────────────────────────────────────────

class ScenarioListenerBase : public ServerListener {
public:
	virtual bool shouldStop() const = 0;
	virtual bool isFinished() const = 0;
	virtual ResultDocument buildDocument() const = 0;
	virtual int exitCode() const = 0;
	virtual void failFromTimeout(const string &msg) = 0;
};

// ─── Catalog entry ────────────────────────────────────────────────────────────

struct ScenarioInfo {
	const char *name;
	const char *description;
	std::vector<string> platforms;
	std::function<SP<ScenarioListenerBase>()> createListener;
};

// ─── Platform ─────────────────────────────────────────────────────────────────

inline string platformName()
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

// ─── JSON helpers ─────────────────────────────────────────────────────────────

inline string jsonEscape(const string &value)
{
	std::ostringstream s;
	for (unsigned char ch : value) {
		switch (ch) {
		case '\\': s << "\\\\"; break;
		case '"':  s << "\\\""; break;
		case '\b': s << "\\b"; break;
		case '\f': s << "\\f"; break;
		case '\n': s << "\\n"; break;
		case '\r': s << "\\r"; break;
		case '\t': s << "\\t"; break;
		default:
			if (ch < 0x20) {
				const char d[] = "0123456789abcdef";
				s << "\\u00" << d[(ch >> 4) & 0xf] << d[ch & 0xf];
			} else {
				s << static_cast<char>(ch);
			}
		}
	}
	return s.str();
}

inline void appendQuoted(std::ostringstream &s, const string &v)
{
	s << '"' << jsonEscape(v) << '"';
}

inline string resultToJson(const ResultDocument &doc)
{
	std::ostringstream s;
	s << "{";
	s << "\"scenario\":"; appendQuoted(s, doc.scenario);
	s << ",\"platform\":"; appendQuoted(s, doc.platform);
	s << ",\"status\":";   appendQuoted(s, doc.status);
	s << ",\"message\":";  appendQuoted(s, doc.message);

	s << ",\"numbers\":{";
	bool first = true;
	for (const auto &e : doc.numbers) {
		if (!first) s << ',';
		first = false;
		appendQuoted(s, e.first); s << ':' << e.second;
	}
	s << '}';

	s << ",\"strings\":{";
	first = true;
	for (const auto &e : doc.strings) {
		if (!first) s << ',';
		first = false;
		appendQuoted(s, e.first); s << ':'; appendQuoted(s, e.second);
	}
	s << '}';

	s << ",\"number_lists\":{";
	first = true;
	for (const auto &e : doc.numberLists) {
		if (!first) s << ',';
		first = false;
		appendQuoted(s, e.first); s << ":[";
		for (size_t i = 0; i < e.second.size(); ++i) {
			if (i != 0) s << ',';
			s << e.second[i];
		}
		s << ']';
	}
	s << '}';

	s << ",\"string_lists\":{";
	first = true;
	for (const auto &e : doc.stringLists) {
		if (!first) s << ',';
		first = false;
		appendQuoted(s, e.first); s << ":[";
		for (size_t i = 0; i < e.second.size(); ++i) {
			if (i != 0) s << ',';
			appendQuoted(s, e.second[i]);
		}
		s << ']';
	}
	s << '}';

	s << ",\"events\":[";
	for (size_t i = 0; i < doc.events.size(); ++i) {
		if (i != 0) s << ',';
		const EventRecord &ev = doc.events[i];
		s << "{\"type\":"; appendQuoted(s, ev.type);
		for (const auto &f : ev.fields) {
			s << ','; appendQuoted(s, f.first); s << ':'; appendQuoted(s, f.second);
		}
		s << '}';
	}
	s << "]}";
	return s.str();
}

inline string scenarioListJson(const std::vector<ScenarioInfo> &catalog)
{
	std::ostringstream s;
	s << "{\"platform\":"; appendQuoted(s, platformName());
	s << ",\"scenarios\":[";
	for (size_t i = 0; i < catalog.size(); ++i) {
		if (i != 0) s << ',';
		const ScenarioInfo &info = catalog[i];
		s << "{\"name\":"; appendQuoted(s, info.name);
		s << ",\"description\":"; appendQuoted(s, info.description);
		s << ",\"platforms\":[";
		for (size_t p = 0; p < info.platforms.size(); ++p) {
			if (p != 0) s << ',';
			appendQuoted(s, info.platforms[p]);
		}
		s << "]}";
	}
	s << "]}";
	return s.str();
}

inline bool writeJsonFile(const string &path, const string &json)
{
	std::ofstream f(path);
	if (!f) return false;
	f << json << '\n';
	return static_cast<bool>(f);
}

// ─── BaseScenarioListener ─────────────────────────────────────────────────────

class BaseScenarioListener : public ScenarioListenerBase {
public:
	explicit BaseScenarioListener(const string &scenarioName)
	{
		document.scenario = scenarioName;
		document.platform = platformName();
	}

	// ScenarioListenerBase
	bool shouldStop()  const override { return stopRequested; }
	bool isFinished()  const override { return finished; }
	int  exitCode()    const override { return document.status == "passed" ? 0 : 1; }
	void failFromTimeout(const string &msg) override { fail(msg); }

	ResultDocument buildDocument() const override
	{
		ResultDocument snap = document;
		snap.numbers["connections"]      = connectedCount;
		snap.numbers["data_callbacks"]   = dataCallbackCount;
		snap.numbers["closed_callbacks"] = closedCount;
		snap.numbers["server_stopped"]   = stopObserved ? 1 : 0;
		for (const auto &e : closedConnections)
			snap.numberLists["closed_connections"].push_back(e);
		return snap;
	}

	// ServerListener defaults
	void onConnected(const SP<Socket> &) override {}

	void onClosed(const SP<Socket> &socket, const string *errorMessage) override
	{
		const int id = idFor(socket);
		++closedCount;
		closedConnections.insert(id);
		logEvent("closed", {
			{"connection", std::to_string(id)},
			{"error", errorMessage ? *errorMessage : ""}
		});
		if (errorMessage)
			onSocketError(socket, id, *errorMessage);
		else
			onSocketClosed(socket, id);
	}

	void onStop() override
	{
		stopObserved = true;
		logEvent("stopped", {});
	}

protected:
	ResultDocument document;
	int nextSocketId      = 1;
	int connectedCount    = 0;
	int dataCallbackCount = 0;
	int closedCount       = 0;
	bool stopObserved     = false;
	bool stopRequested    = false;
	bool finished         = false;
	std::set<int> closedConnections;

	// Overrideable close hooks called from onClosed
	virtual void onSocketClosed(const SP<Socket> &, int) {}
	virtual void onSocketError(const SP<Socket> &, int, const string &error)
	{
		fail("unexpected socket close error: " + error);
	}

	int idFor(const SP<Socket> &socket)
	{
		try { return std::any_cast<int>(socket->userData); }
		catch (const std::bad_any_cast &) {}
		const int id = nextSocketId++;
		socket->userData = id;
		return id;
	}

	void logEvent(const string &type, std::map<string, string> fields)
	{
		document.events.push_back(EventRecord{type, std::move(fields)});
	}

	void pass(const string &msg)
	{
		if (finished) return;
		finished = true; stopRequested = true;
		document.status = "passed"; document.message = msg;
	}

	void fail(const string &msg)
	{
		if (finished && document.status == "failed") return;
		finished = true; stopRequested = true;
		document.status = "failed"; document.message = msg;
	}
};
