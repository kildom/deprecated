# Secure JavaScript sandbox

## Build

1. Make sure that this repository is placed in empty parent directory.
   Some build directories will be created in parent directory.

1. Prepare system to build Spidermonkey to WebAssembly and make sure
   you have Node.js 20+. Use Dockerfile for ready to use setup.

1. Install NPM packages.
   ```shell
   npm ci
   ```

1. Download necessary tools for WebAssembly.
   ```shell
   npm run wasm-download
   ```

1. Download correct Spidermonkey sources.
   ```shell
   npm run moz-download
   ```

1. Bootstrap your system for Spidermonkey building.
   ```shell
   npm run moz-bootstrap
   ```

1. Build Spidermonkey.
   ```shell
   npm run moz-build
   ```
   Optionally, you can choose one target using parameter: `release`, `size`, or `debug`.

1. Build sandbox WebAssembly module.
   ```shell
   npm run wasm-build
   ```
   Optionally, you can choose one target using parameter: `release`, `size`, or `debug`.

1. ...
