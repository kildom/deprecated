# Server Integration Tests

This directory contains integration tests for the `Server` and `EncryptedSocket` classes.

## What is here

**C++ scenario runner:**
- `main.cpp` — entry point: combines both scenario catalogs, handles CLI, drives the poll loop
- `test_common.hpp` — shared types (`ResultDocument`, `EventRecord`), base listener class, JSON helpers
- `test_Server.hpp` / `test_Server.cpp` — `Server` class scenario implementations
- `test_EncryptedSocket.hpp` / `test_EncryptedSocket.cpp` — `EncryptedSocket` class scenario implementations
- the compiled binary is written to `build/test/server_test_app`

**Python test suites:**
- `conftest.py` — shared pytest fixtures (`test_binary`, `scenario_catalog`) and helper functions
- `test_Server.py` — pytest tests for the `Server` class
- `test_EncryptedSocket.py` — pytest tests for the `EncryptedSocket` class
- `test.py` — convenience entry: re-exports both suites so `pytest test.py` runs everything

Each scenario writes a JSON result file containing server-side observed events and summary values.

## Python requirements

- Python 3
- `pytest`
- `cryptography` (required for `EncryptedSocket` tests only)

The test scripts use Python standard library modules for everything else.

Install all Python dependencies:

```sh
python -m pip install pytest cryptography
```

If you use a virtual environment, activate it before running the tests.

Example on Linux or macOS:

```sh
source .venv/bin/activate
```

Example on Windows Command Prompt:

```bat
.venv\Scripts\activate.bat
```

Example on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

## Run on Linux

Build the scenario runner:

```sh
cd test/Server
make
```

This writes the binary to:

```sh
build/test/server_test_app
```

Run all tests:

```sh
cd test/Server
python -m pytest -v
```

Run only the `Server` suite:

```sh
python -m pytest -v test_Server.py
```

Run only the `EncryptedSocket` suite:

```sh
python -m pytest -v test_EncryptedSocket.py
```

Run a single test:

```sh
python -m pytest -v test_Server.py -k echo_basic
```

## Run on other platforms

The Python test suite can reuse a prebuilt scenario runner binary.

Set `SERVER_TEST_BINARY` to the path of the platform-specific executable, then run pytest:

```sh
cd test/Server
SERVER_TEST_BINARY=/path/to/server_test_app python -m pytest -v
```

This is intended for future Windows support once a runner is built with `Server-win.cpp`.

## Where to see results

- Pytest prints pass/fail status in the terminal.
- Each test creates a JSON result file in pytest's temporary directory.

If you want results written to a predictable location, run:

```sh
python -m pytest -v --basetemp=.pytest-results
```

## Result format

Each JSON result file contains:

- `scenario` — scenario name
- `platform` — platform reported by the runner
- `status` — `passed` or `failed`
- `message` — short scenario summary
- `numbers` — numeric counters (connections, callbacks, etc.)
- `strings`, `string_lists`, `number_lists` — scenario-specific values
- `events` — ordered event log captured by the C++ runner

## Current scenarios

**Server:**
- `echo_basic`
- `greeting_on_connect`
- `chunked_read_echo`
- `server_initiated_close`
- `multi_client_echo`
- repeated echo stress test (10×, `@pytest.mark.slow`)

**EncryptedSocket:**
- `encrypted_echo` — round-trip with default zero key
- `encrypted_echo_with_key` — round-trip with a non-zero key
- `encrypted_multiple_messages` — three sequential messages
- `encrypted_bad_marker` — server correctly rejects invalid begin marker
- `encrypted_bad_tag` — server correctly rejects corrupted authentication tag


## Python requirements

- Python 3
- `pytest`

The test script uses Python standard library modules for everything except `pytest`.

If you use a virtual environment, activate it before running the tests.

Example on Linux or macOS:

```sh
source .venv/bin/activate
```

Example on Windows Command Prompt:

```bat
.venv\Scripts\activate.bat
```

Example on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Install the Python dependency:

```sh
python -m pip install pytest
```

## Run on Linux

Build the scenario runner:

```sh
cd test/Server
make
```

This writes the binary to:

```sh
build/test/server_test_app
```

Run the test suite:

```sh
cd test/Server
python -m pytest -q test.py
```

Run only one test:

```sh
cd test/Server
python -m pytest -q test.py -k echo_basic
```

## Run on other platforms

The Python test suite can reuse a prebuilt scenario runner binary.

Set `SERVER_TEST_BINARY` to the path of the platform-specific executable, then run pytest:

```sh
cd test/Server
SERVER_TEST_BINARY=/path/to/server_test_app python -m pytest -q test.py
```

This is intended for future Windows support once a runner is built with `Server-win.cpp`.

## Where to see results

- Pytest prints pass/fail status in the terminal.
- Each test creates a JSON result file in pytest's temporary directory.
- On Linux, these files are typically under a path like `/tmp/pytest-of-<user>/pytest-<n>/...`.

If you want pytest to keep and show the temp directory path, run:

```sh
cd test/Server
python -m pytest -q test.py --basetemp=.pytest-results
```

Then the per-test JSON files will be written under:

```sh
.pytest-results
```

## Result format

Each JSON result file contains fields such as:

- `scenario`: scenario name
- `platform`: platform reported by the runner
- `status`: `passed` or `failed`
- `message`: short scenario summary
- `numbers`: numeric counters such as connection and callback counts
- `strings`, `string_lists`, `number_lists`: scenario-specific values
- `events`: ordered event log captured by the C++ runner

## Current scenarios

- `echo_basic`
- `greeting_on_connect`
- `chunked_read_echo`
- `server_initiated_close`
- `multi_client_echo`
- repeated echo stress test through pytest