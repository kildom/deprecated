#!/bin/bash
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

sudo apt-get update

cd ../../../gecko-dev/
./mach --no-interactive bootstrap --application-choice=js
