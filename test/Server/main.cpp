#include <chrono>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#include "test_Server.hpp"
#include "test_EncryptedSocket.hpp"

namespace {

std::vector<ScenarioInfo> buildCatalog()
{
std::vector<ScenarioInfo> catalog;
for (const auto &s : serverScenarios())
catalog.push_back(s);
for (const auto &s : encryptedSocketScenarios())
catalog.push_back(s);
return catalog;
}

const ScenarioInfo *findScenario(const std::vector<ScenarioInfo> &catalog, const string &name)
{
for (const auto &s : catalog) {
if (s.name == name)
return &s;
}
return nullptr;
}

struct Options {
bool listScenarios = false;
const ScenarioInfo *scenario = nullptr;
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

bool parseOptions(int argc, char **argv, Options &options,
  const std::vector<ScenarioInfo> &catalog, string &error)
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
options.scenario = findScenario(catalog, value);
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
  SP<ScenarioListenerBase> listener = options.scenario->createListener();
  Server server;

  if (!server.start(options.bindSpec, std::static_pointer_cast<ServerListener>(listener))) {
ResultDocument document;
document.scenario = options.scenario->name;
document.platform = platformName();
document.status = "failed";
document.message = "server start failed";
if (!writeJsonFile(options.resultPath, resultToJson(document)))
std::cerr << "failed to write result file\n";
return 1;
}

const auto deadline =
std::chrono::steady_clock::now() + std::chrono::milliseconds(options.timeoutMs);
bool running = true;
while (running) {
if (listener->shouldStop())
server.stop();

running = server.poll(50);
if (!running)
break;

if (listener->isFinished()) {
server.stop();
continue;
}

if (std::chrono::steady_clock::now() >= deadline) {
listener->failFromTimeout("timed out waiting for scenario completion");
server.stop();
}
}

const ResultDocument document = listener->buildDocument();
if (!writeJsonFile(options.resultPath, resultToJson(document))) {
std::cerr << "failed to write result file\n";
return 1;
}
return listener->exitCode();
}

} // namespace

int main(int argc, char **argv)
{
const std::vector<ScenarioInfo> catalog = buildCatalog();
Options options;
string error;
if (!parseOptions(argc, argv, options, catalog, error)) {
std::cerr << error << '\n';
return 2;
}

if (options.listScenarios) {
std::cout << scenarioListJson(catalog) << '\n';
return 0;
}

return runScenario(options);
}
