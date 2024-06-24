
# Building the WebAssembly module

## Dependencies

Preferred way to build the module is by using a Docker image.
You can create it using `scripts/Dockerfile` file.

If you prefer not to use it, here are the requirements:
* Linux (Ubuntu is preferred)
* Python
* Node.js (minimum 18) and npm
* Rust with `wasm32-wasi` target
* [Binaryen](https://github.com/WebAssembly/binaryen)
* [WABT](https://github.com/WebAssembly/wabt)

## Build the Spidermonkey

First, put this repository in an empty directory.
Spidermonkey sources and build artifacts will be placed in parent directory
of this repository.

<!-- TODO Place gecko-dev in project directory, builded Spidermonkey in build/mozrelease, build/mozdebug, build/mozsize. -->

Download a patched sources of the Spidermonkey engine.
It will be created in `../gecko-dev` (relative to the project directory):

```shell
npm run moz-download
```

Bootstrap your system (or Docker container) for building the Spidermonkey engine.
It will download install all the required linux packages and download tools in the
`$HOME/.mozbuild` directory:

```shell
npm run moz-bootstrap
```

Your system should be able to compile Spidermonkey.
Build Spidermonkey libraries:

```shell
npm run moz-build
```

It will build three variants of the libraries:
* `release` - Production version optimized for speed.
* `size` - Production version optimized for size.
* `debug` - Debug version without optimization containing information required for debugging.

If you want to to rebuild just one variant, use the following command:

```shell
npm run moz-build debug
```

## Build WebAssembly module

To build WebAssembly module, type:

```shell
npm run wasm-build
```

It will produce three variants: `dist/debug.wasm`, `dist/release.wasm` and `dist/size.wasm`.

If you want to build just one variant, type:

```shell
npm run wasm-build debug
```
