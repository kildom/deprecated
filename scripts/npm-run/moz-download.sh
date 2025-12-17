#!/bin/bash
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

BRANCH=sandbox-FIREFOX_146_0_RELEASE
REPO=https://github.com/kildom/sandbox-spidermonkey

git clone "$REPO" --depth 1 --branch $BRANCH ../../../gecko-dev
