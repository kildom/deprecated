#!/bin/bash
set -e

docker build -t spidermonkey-wasm .
docker images
echo Remove unused Docker images with: docker rmi
