#!/bin/bash
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

build_it () {
    make -j`nproc` MODE=$1
}

cd ../../src-wasm

if [[ "$1" == "debug" ]]; then
    build_it debug
elif [[ "$1" == "release" ]]; then
    build_it release
elif [[ "$1" == "size" ]]; then
    build_it size
elif [[ "$1" == "" ]]; then
    build_it debug
    build_it release
    build_it size
else
    echo 'Unknown mode. Provide: "debug", "release", "size" or none to build all.'
fi

