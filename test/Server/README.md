# Server Integration Tests

This directory contains integration tests for the `Server` class.

## What is here

- `main.cpp` builds a scenario runner binary.
- `test.py` is a `pytest` test suite that starts the scenario runner and acts as one or more clients.
- the compiled scenario runner is written to `build/test/server_test_app`.
- Each scenario writes a JSON result file that contains the server-side observed events and summary values.

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