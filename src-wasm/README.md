# JavaScript Sandbox - WebAssembly Module

This directory contains the code of WebAssembly module.
The module embeds Spidermonkey JavaScript engine compiled to WebAssembly.
It exposes API to create sandboxed JavaScript environments,
execute code, and exchange data with the host environment.

## Wrapper

The `src-wasm/wrapper` subdirectory contains code that wraps the WebAssembly module,
providing a convenient TypeScript interface hiding low-level details of WebAssembly,
for example pointer and memory management.

## Build

### Requirements

Building requires the following tools. You can build a Docker container from the provided [Dockerfile](../scripts/Dockerfile) for ready to use setup
and skip installation of the following tools on your host system.

* Linux OS, e.g. Ubuntu 22+
* Rust with `wasm32-wasip1` target
* Node.js 20+
* [Binaryen](https://github.com/WebAssembly/binaryen/)
* [WABT](https://github.com/WebAssembly/wabt/)

See the [scripts/Dockerfile](../scripts/Dockerfile) for details on the installation of these tools.

### Preparation

