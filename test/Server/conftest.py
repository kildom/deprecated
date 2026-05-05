"""Shared fixtures and helper functions for all Server integration test suites."""
import json
import os
import platform
import socket
import subprocess
import time
from pathlib import Path

import pytest


TEST_DIR = Path(__file__).resolve().parent
REPO_ROOT = TEST_DIR.parent.parent
BINARY_ENV = "SERVER_TEST_BINARY"
DEFAULT_BINARY = REPO_ROOT / "build" / "test" / "server_test_app"
_CURRENT_PLATFORM = platform.system().lower()


# ─── Platform ─────────────────────────────────────────────────────────────────

def current_platform_name() -> str:
    if _CURRENT_PLATFORM.startswith("linux"):
        return "linux"
    if _CURRENT_PLATFORM.startswith("windows"):
        return "windows"
    if _CURRENT_PLATFORM.startswith("darwin"):
        return "macos"
    return _CURRENT_PLATFORM


# ─── Pytest fixtures ──────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def test_binary() -> Path:
    binary_override = os.environ.get(BINARY_ENV)
    if binary_override:
        binary = Path(binary_override)
        if not binary.exists():
            pytest.fail(f"{BINARY_ENV} points to missing binary: {binary}")
        return binary

    if current_platform_name() != "linux":
        pytest.skip(f"Set {BINARY_ENV} to a prebuilt scenario runner on this platform")

    subprocess.run(["make"], cwd=TEST_DIR, check=True)
    if not DEFAULT_BINARY.exists():
        pytest.fail("make completed but the test binary was not created")
    return DEFAULT_BINARY


@pytest.fixture(scope="session")
def scenario_catalog(test_binary: Path) -> dict[str, dict]:
    completed = subprocess.run(
        [str(test_binary), "--list-scenarios"],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(completed.stdout)
    return {entry["name"]: entry for entry in payload["scenarios"]}


# ─── Helper functions (imported explicitly by test files) ─────────────────────

def require_supported(scenario_catalog: dict[str, dict], scenario_name: str) -> None:
    entry = scenario_catalog[scenario_name]
    if current_platform_name() not in entry["platforms"]:
        pytest.skip(
            f"scenario {scenario_name!r} is not supported on {current_platform_name()!r}"
        )


def reserve_tcp_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.bind(("127.0.0.1", 0))
        probe.listen(1)
        return probe.getsockname()[1]


def connect_with_retry(port: int, timeout: float = 2.0) -> socket.socket:
    """Return a connected socket, retrying until the server is up."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.settimeout(0.2)
        try:
            client.connect(("127.0.0.1", port))
            return client
        except OSError:
            client.close()
            time.sleep(0.02)
    raise AssertionError(f"server did not accept client connections on port {port}")


def recv_exact(sock: socket.socket, expected: bytes) -> bytes:
    """Read exactly len(expected) bytes from sock."""
    data = bytearray()
    while len(data) < len(expected):
        chunk = sock.recv(len(expected) - len(data))
        if not chunk:
            break
        data.extend(chunk)
    return bytes(data)


def run_scenario(
    test_binary: Path,
    scenario_name: str,
    client_action,
    tmp_path: Path,
    timeout_ms: int = 4000,
    result_suffix: str = "",
) -> dict:
    """
    Start the scenario runner binary, run client_action(port), wait for it to
    finish, and return the parsed JSON result document.

    Asserts that the process exits with code 0 and the result has status "passed".
    """
    result_path = tmp_path / f"{scenario_name}{result_suffix}.json"
    port = reserve_tcp_port()
    command = [
        str(test_binary),
        "--scenario", scenario_name,
        "--bind", f"127.0.0.1:{port}",
        "--result", str(result_path),
        "--timeout-ms", str(timeout_ms),
    ]
    process = subprocess.Popen(command, cwd=TEST_DIR)
    try:
        client_action(port)
        return_code = process.wait(timeout=max(2.0, timeout_ms / 1000 + 2.0))
    except Exception:
        process.kill()
        process.wait(timeout=2)
        raise

    assert result_path.exists(), f"scenario runner did not write {result_path}"
    payload = json.loads(result_path.read_text())
    assert return_code == 0, payload
    assert payload["status"] == "passed", payload
    return payload
