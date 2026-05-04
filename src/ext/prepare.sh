#!/bin/bash
set -e

# TODO: Download Botan and sqlite3mc (if not exist)

# TODO: Compile Botan (if build/botan/lib/libbotan-3.a doesn't exist), example:
python ./configure.py --minimized-build --prefix=`realpath ../../..`/build/botan \
    --enable-modules=system_rng,auto_rng,aes,modes,stream,gcm \
    --disable-shared-library

make -j`nproc`

make install
