"""Integration tests for the Server class."""
import socket
import threading
from pathlib import Path

import pytest

from conftest import (
    connect_with_retry,
    recv_exact,
    require_supported,
    run_scenario,
)


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


def test_greeting_on_connect(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    require_supported(scenario_catalog, "greeting_on_connect")

    def client_action(port: int) -> None:
        with connect_with_retry(port) as client:
            greeting = recv_exact(client, b"hello from server")
            assert greeting == b"hello from server"

    payload = run_scenario(test_binary, "greeting_on_connect", client_action, tmp_path)
    assert payload["strings"]["sent_greeting"] == "hello from server"
    assert payload["numbers"]["connections"] == 1


def test_chunked_read_echo(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    require_supported(scenario_catalog, "chunked_read_echo")

    def client_action(port: int) -> None:
        with connect_with_retry(port) as client:
            client.sendall(b"ABCDEFGHIJ")
            echoed = recv_exact(client, b"ABCDEFGHIJ")
            assert echoed == b"ABCDEFGHIJ"

    payload = run_scenario(test_binary, "chunked_read_echo", client_action, tmp_path)
    assert payload["string_lists"]["received_payloads"] == ["ABCDEFGHIJ"]
    assert payload["number_lists"]["chunk_sizes"] == [3, 3, 3, 1]


def test_server_initiated_close(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    require_supported(scenario_catalog, "server_initiated_close")

    def client_action(port: int) -> None:
        with connect_with_retry(port) as client:
            client.sendall(b"close-me")
            client.shutdown(socket.SHUT_WR)
            assert client.recv(32) == b""

    payload = run_scenario(test_binary, "server_initiated_close", client_action, tmp_path)
    assert payload["numbers"]["closed_callbacks"] == 1
    assert payload["string_lists"]["received_payloads"] == ["close-me"]


def test_multi_client_echo(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
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
def test_repeated_echo_sessions(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    require_supported(scenario_catalog, "echo_basic")

    for iteration in range(10):
        def client_action(
            port: int, expected: bytes = f"ping-{iteration}".encode()
        ) -> None:
            with connect_with_retry(port) as client:
                client.sendall(expected)
                echoed = recv_exact(client, expected)
                assert echoed == expected

        payload = run_scenario(
            test_binary, "echo_basic", client_action, tmp_path,
            result_suffix=f"-{iteration}",
        )
        assert payload["status"] == "passed"


import pytest  # noqa: E402 (needed for @pytest.mark.slow above)
