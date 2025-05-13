#!/bin/bash
set -e

echo Restart SSHD if needed: service ssh restart

docker run -it -p 2222:22 -v `realpath .`:/usr/local/src/project spidermonkey-wasm

docker ps -a
echo Remove if not needed any more: docker rm 

