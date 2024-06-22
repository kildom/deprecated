#!/bin/bash
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd $SCRIPT_DIR/../mozilla-unified
MOZ_OBJDIR=`realpath ../mozdebug` MOZCONFIG=`realpath ../project/mozdebug` ./mach build

cd $SCRIPT_DIR/../project/src
make -j7 DEBUG=1

#npm run compile-web-test
