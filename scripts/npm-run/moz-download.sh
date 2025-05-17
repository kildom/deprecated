#!/bin/bash
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

BRANCH=commit-d879277
REPO=https://github.com/kildom/gecko-dev

git clone "$REPO" --depth 1 --branch $BRANCH ../../../gecko-dev
