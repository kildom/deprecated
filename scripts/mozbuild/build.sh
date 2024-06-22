#!/bin/bash
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

build_it () {
  MOZ_OBJDIR=`realpath ../$1` MOZCONFIG=$SCRIPT_DIR/$1 ./mach build
}

cd ../../../gecko-dev/

if [[ "$1" == "debug" ]]; then
    build_it mozdebug
elif [[ "$1" == "release" ]]; then
    build_it mozrelease
elif [[ "$1" == "size" ]]; then
    build_it mozsize
else
    build_it mozdebug
    build_it mozrelease
    build_it mozsize
fi

