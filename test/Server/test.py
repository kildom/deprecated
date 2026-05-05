# Run this file to execute all integration tests: pytest test.py
# Run individual suites: pytest test_Server.py  /  pytest test_EncryptedSocket.py
from test_Server import *           # noqa: F401 F403
from test_EncryptedSocket import *  # noqa: F401 F403
