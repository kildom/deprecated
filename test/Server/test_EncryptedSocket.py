"""Integration tests for EncryptedSocket.

The Python client implements the same wire protocol as the C++ EncryptedSocket class:
- AES-128-GCM with a 96-bit (12-byte) authentication tag
- 8-byte (64-bit) little-endian nonce counter
- Message format: [marker:4][length:4][ciphertext][tag:12]
- Client-to-server nonce starts at 0
- Server-to-client nonce starts at 0x8000000000000000
"""
import socket
import struct
from pathlib import Path

import pytest

from conftest import (
    connect_with_retry,
    require_supported,
    run_scenario,
    reserve_tcp_port,
)

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    _CRYPTO_AVAILABLE = True
except ImportError:
    _CRYPTO_AVAILABLE = False


pytestmark = pytest.mark.skipif(
    not _CRYPTO_AVAILABLE,
    reason="cryptography package is required for EncryptedSocket tests",
)

# ─── Protocol constants ───────────────────────────────────────────────────────

INCOMING_MARKER = 0x50dd3ac6  # client → server begin marker
OUTGOING_MARKER = 0xe859c294  # server → client begin marker
HEADER_SIZE = 8                # marker(4) + length(4)
TAG_SIZE = 12

ZERO_KEY = bytes(16)                  # initial key: all zeros
TEST_KEY = bytes(range(1, 17))        # non-zero test key: 0x01..0x10


# ─── EncryptedClient helper ───────────────────────────────────────────────────

class EncryptedClient:
    """Python-side implementation of the EncryptedSocket wire protocol."""

    def __init__(self, sock: socket.socket, key: bytes = ZERO_KEY) -> None:
        self.sock = sock
        self.sock.settimeout(3.0)
        self.key = key
        self.send_nonce: int = 0
        self.recv_nonce: int = 0x8000000000000000

    def set_key(self, key: bytes) -> None:
        self.key = key

    def send_message(self, plaintext: bytes) -> None:
        """Encrypt and send one message to the server."""
        nonce = struct.pack("<Q", self.send_nonce)
        self.send_nonce += 1
        msg_length = HEADER_SIZE + len(plaintext) + TAG_SIZE
        aad = struct.pack("<I", msg_length)

        enc = Cipher(algorithms.AES(self.key), modes.GCM(nonce)).encryptor()
        enc.authenticate_additional_data(aad)
        ct = enc.update(plaintext) + enc.finalize()
        tag = enc.tag[:TAG_SIZE]  # truncate 16-byte GCM tag to 12 bytes

        header = struct.pack("<II", INCOMING_MARKER, msg_length)
        self.sock.sendall(header + ct + tag)

    def recv_message(self) -> bytes:
        """Receive and decrypt one message from the server."""
        header_data = self._recv_exact(HEADER_SIZE)
        marker, msg_length = struct.unpack("<II", header_data)
        if marker != OUTGOING_MARKER:
            raise ValueError(f"bad outgoing marker: {marker:#010x}")
        if msg_length < HEADER_SIZE + TAG_SIZE:
            raise ValueError(f"message too short: {msg_length}")

        payload = self._recv_exact(msg_length - HEADER_SIZE)
        ct = payload[:-TAG_SIZE]
        tag = payload[-TAG_SIZE:]

        nonce = struct.pack("<Q", self.recv_nonce)
        self.recv_nonce += 1
        aad = struct.pack("<I", msg_length)

        dec = Cipher(
            algorithms.AES(self.key),
            modes.GCM(nonce, min_tag_length=TAG_SIZE),
        ).decryptor()
        dec.authenticate_additional_data(aad)
        plaintext = dec.update(ct)
        return plaintext + dec.finalize_with_tag(tag)

    def _recv_exact(self, n: int) -> bytes:
        data = bytearray()
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk:
                raise EOFError(
                    f"connection closed after {len(data)} of {n} expected bytes"
                )
            data.extend(chunk)
        return bytes(data)

    def recv_until_closed(self) -> bytes:
        """Read until the server closes the connection."""
        data = bytearray()
        self.sock.settimeout(2.0)
        try:
            while True:
                chunk = self.sock.recv(4096)
                if not chunk:
                    break
                data.extend(chunk)
        except (socket.timeout, ConnectionResetError):
            pass
        return bytes(data)


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_encrypted_echo(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    """Basic encrypted echo using the default zero key."""
    require_supported(scenario_catalog, "encrypted_echo")

    def client_action(port: int) -> None:
        with connect_with_retry(port) as sock:
            client = EncryptedClient(sock)
            client.send_message(b"hello encrypted world")
            reply = client.recv_message()
            assert reply == b"hello encrypted world"

    payload = run_scenario(test_binary, "encrypted_echo", client_action, tmp_path)
    assert payload["numbers"]["connections"] == 1
    assert payload["numbers"]["closed_callbacks"] == 1


def test_encrypted_echo_with_key(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    """Encrypted echo using the non-zero test key."""
    require_supported(scenario_catalog, "encrypted_echo_with_key")

    def client_action(port: int) -> None:
        with connect_with_retry(port) as sock:
            client = EncryptedClient(sock, key=TEST_KEY)
            client.send_message(b"keyed message")
            reply = client.recv_message()
            assert reply == b"keyed message"

    payload = run_scenario(
        test_binary, "encrypted_echo_with_key", client_action, tmp_path
    )
    assert payload["numbers"]["connections"] == 1
    assert payload["numbers"]["closed_callbacks"] == 1


def test_encrypted_multiple_messages(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    """Send and receive multiple encrypted messages in sequence."""
    require_supported(scenario_catalog, "encrypted_multiple_messages")
    messages = [b"first", b"second", b"third"]

    def client_action(port: int) -> None:
        with connect_with_retry(port) as sock:
            client = EncryptedClient(sock)
            for msg in messages:
                client.send_message(msg)
                reply = client.recv_message()
                assert reply == msg

    payload = run_scenario(
        test_binary, "encrypted_multiple_messages", client_action, tmp_path
    )
    assert payload["numbers"]["connections"] == 1
    assert payload["numbers"]["closed_callbacks"] == 1


def test_encrypted_bad_marker(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    """Server must detect and reject a message with an invalid begin marker."""
    require_supported(scenario_catalog, "encrypted_bad_marker")

    def client_action(port: int) -> None:
        with connect_with_retry(port) as sock:
            # Send 30 bytes with a clearly wrong marker
            bad_header = struct.pack("<II", 0xDEADBEEF, 30)
            sock.sendall(bad_header + bytes(22))
            # Server will close the connection; drain any remaining bytes
            sock.settimeout(2.0)
            try:
                while sock.recv(1024):
                    pass
            except (socket.timeout, ConnectionResetError):
                pass

    payload = run_scenario(
        test_binary, "encrypted_bad_marker", client_action, tmp_path
    )
    assert payload["numbers"]["connections"] == 1
    assert payload["numbers"]["closed_callbacks"] == 1


def test_encrypted_bad_tag(
    test_binary: Path, scenario_catalog: dict[str, dict], tmp_path: Path
) -> None:
    """Server must detect and reject a message with a corrupted authentication tag."""
    require_supported(scenario_catalog, "encrypted_bad_tag")

    def client_action(port: int) -> None:
        with connect_with_retry(port) as sock:
            plaintext = b"tampered"
            # Build a valid message
            nonce = struct.pack("<Q", 0)
            msg_length = HEADER_SIZE + len(plaintext) + TAG_SIZE
            aad = struct.pack("<I", msg_length)
            enc = Cipher(algorithms.AES(ZERO_KEY), modes.GCM(nonce)).encryptor()
            enc.authenticate_additional_data(aad)
            ct = enc.update(plaintext) + enc.finalize()
            tag = enc.tag[:TAG_SIZE]
            # Corrupt the last byte of the tag
            bad_tag = tag[:-1] + bytes([tag[-1] ^ 0xFF])
            header = struct.pack("<II", INCOMING_MARKER, msg_length)
            sock.sendall(header + ct + bad_tag)
            # Server will close the connection
            sock.settimeout(2.0)
            try:
                while sock.recv(1024):
                    pass
            except (socket.timeout, ConnectionResetError):
                pass

    payload = run_scenario(
        test_binary, "encrypted_bad_tag", client_action, tmp_path
    )
    assert payload["numbers"]["connections"] == 1
    assert payload["numbers"]["closed_callbacks"] == 1
