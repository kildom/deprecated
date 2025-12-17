#!/bin/bash
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

sudo apt-get update

cd ../../../gecko-dev/
./mach --no-interactive bootstrap --application-choice=js

cd ~/.mozbuild
wget -O ../sysroot-wasm32-wasi.tar.zst https://firefox-ci-tc.services.mozilla.com/api/queue/v1/task/b1ggAEfgRYaHUiaBIjOpMw/runs/0/artifacts/public%2Fbuild%2Fsysroot-wasm32-wasi.tar.zst
tar -xf ../sysroot-wasm32-wasi.tar.zst
rm ../sysroot-wasm32-wasi.tar.zst
