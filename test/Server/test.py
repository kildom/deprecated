import json
import os
import platform
import socket
import subprocess
import threading
import time
from pathlib import Path

import pytest


TEST_DIR = Path(__file__).resolve().parent
REPO_ROOT = TEST_DIR.parent.parent
BINARY_ENV = "SERVER_TEST_BINARY"
DEFAULT_BINARY = REPO_ROOT / "build" / "test" / "server_test_app"
CURRENT_PLATFORM = platform.system().lower()


def current_platform_name() -> str:
	if CURRENT_PLATFORM.startswith("linux"):
		return "linux"
	if CURRENT_PLATFORM.startswith("windows"):
		return "windows"
	if CURRENT_PLATFORM.startswith("darwin"):
		return "macos"
	return CURRENT_PLATFORM


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


def require_supported(scenario_catalog: dict[str, dict], scenario_name: str) -> None:
	entry = scenario_catalog[scenario_name]
	if current_platform_name() not in entry["platforms"]:
		pytest.skip(f"scenario {scenario_name} is not supported on {current_platform_name()}")


def reserve_tcp_port() -> int:
	with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
		probe.bind(("127.0.0.1", 0))
		probe.listen(1)
		return probe.getsockname()[1]


def connect_with_retry(port: int, timeout: float = 2.0) -> socket.socket:
	deadline = time.time() + timeout
	while time.time() < deadline:
		client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		client.settimeout(0.2)
		try:
			try:
				client.connect(("127.0.0.1", port))
			except OSError:
				client.close()
				time.sleep(0.02)
				continue
			return client
		except Exception:
			client.close()
			raise
	raise AssertionError(f"server did not accept client connections on port {port}")


def recv_exact(sock: socket.socket, expected: bytes) -> bytes:
	data = bytearray()
	while len(data) < len(expected):
		chunk = sock.recv(len(expected) - len(data))
		if not chunk:
			break
		data.extend(chunk)
	return bytes(data)


def run_scenario(test_binary: Path, scenario_name: str, client_action, tmp_path: Path, timeout_ms: int = 4000) -> dict:
	result_path = tmp_path / f"{scenario_name}.json"
	port = reserve_tcp_port()
	command = [
		str(test_binary),
		"--scenario",
		scenario_name,
		"--bind",
		f"127.0.0.1:{port}",
		"--result",
		str(result_path),
		"--timeout-ms",
		str(timeout_ms),
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


def test_echo_basic(test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path) -> None:
	require_supported(scenario_catalog, "echo_basic")

	def client_action(port: int) -> None:
		with connect_with_retry(port) as client:
			client.sendall(b"ping from client")
			echoed = recv_exact(client, b"ping from client")
			assert echoed == b"ping from client"

	payload = run_scenario(test_binary, "echo_basic", client_action, tmp_path)
	assert payload["numbers"]["connections"] == 1
	assert payload["numbers"]["closed_callbacks"] == 1
	assert payload["string_lists"]["received_payloads"] == ["ping from client"]


def test_greeting_on_connect(test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path) -> None:
	require_supported(scenario_catalog, "greeting_on_connect")

	def client_action(port: int) -> None:
		with connect_with_retry(port) as client:
			greeting = recv_exact(client, b"hello from server")
			assert greeting == b"hello from server"

	payload = run_scenario(test_binary, "greeting_on_connect", client_action, tmp_path)
	assert payload["strings"]["sent_greeting"] == "hello from server"
	assert payload["numbers"]["connections"] == 1


def test_chunked_read_echo(test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path) -> None:
	require_supported(scenario_catalog, "chunked_read_echo")

	def client_action(port: int) -> None:
		with connect_with_retry(port) as client:
			client.sendall(b"ABCDEFGHIJ")
			echoed = recv_exact(client, b"ABCDEFGHIJ")
			assert echoed == b"ABCDEFGHIJ"

	payload = run_scenario(test_binary, "chunked_read_echo", client_action, tmp_path)
	assert payload["string_lists"]["received_payloads"] == ["ABCDEFGHIJ"]
	assert payload["number_lists"]["chunk_sizes"] == [3, 3, 3, 1]


def test_server_initiated_close(test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path) -> None:
	require_supported(scenario_catalog, "server_initiated_close")

	def client_action(port: int) -> None:
		with connect_with_retry(port) as client:
			client.sendall(b"close-me")
			client.shutdown(socket.SHUT_WR)
			assert client.recv(32) == b""

	payload = run_scenario(test_binary, "server_initiated_close", client_action, tmp_path)
	assert payload["numbers"]["closed_callbacks"] == 1
	assert payload["string_lists"]["received_payloads"] == ["close-me"]


def test_multi_client_echo(test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path) -> None:
	require_supported(scenario_catalog, "multi_client_echo")
	replies: list[bytes] = []

	def worker(port: int, payload: bytes) -> None:
		with connect_with_retry(port) as client:
			client.sendall(payload)
			replies.append(recv_exact(client, b"ack:" + payload))

	def client_action(port: int) -> None:
		first = threading.Thread(target=worker, args=(port, b"alpha"))
		second = threading.Thread(target=worker, args=(port, b"bravo"))
		first.start()
		second.start()
		first.join(timeout=2)
		second.join(timeout=2)
		assert not first.is_alive()
		assert not second.is_alive()

	payload = run_scenario(test_binary, "multi_client_echo", client_action, tmp_path)
	assert sorted(replies) == [b"ack:alpha", b"ack:bravo"]
	assert sorted(payload["string_lists"]["received_payloads"]) == ["alpha", "bravo"]
	assert payload["numbers"]["connections"] == 2


@pytest.mark.slow
def test_repeated_echo_sessions(test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path) -> None:
	require_supported(scenario_catalog, "echo_basic")

	for iteration in range(10):
		def client_action(port: int, expected: bytes = f"ping-{iteration}".encode()) -> None:
			with connect_with_retry(port) as client:
				client.sendall(expected)
				echoed = recv_exact(client, expected)
				assert echoed == expected

		result_path = tmp_path / f"repeat-{iteration}.json"
		port = reserve_tcp_port()
		command = [
			str(test_binary),
			"--scenario",
			"echo_basic",
			"--bind",
			f"127.0.0.1:{port}",
			"--result",
			str(result_path),
			"--timeout-ms",
			"4000",
		]
		process = subprocess.Popen(command, cwd=TEST_DIR)
		try:
			client_action(port)
			return_code = process.wait(timeout=6)
		except Exception:
			process.kill()
			process.wait(timeout=2)
			raise

		payload = json.loads(result_path.read_text())
		assert return_code == 0, payload
		assert payload["status"] == "passed", payload
