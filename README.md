# Secure JavaScript sandbox

## Build

1. Make sure that this repository is placed in empty parent directory.
   Some build directories will be created in parent directory.

2. Prepare system to build Spidermonkey to WebAssembly and make sure
   you have Node.js 20+. Use Dockerfile for ready to use setup.

3. Download necessary tools for WebAssembly.
   ```
   npm run wasm-download
   ```

4. Download correct Spidermonkey sources.
   ```shell
   npm run moz-download
   ```

5. Bootstrap your system for Spidermonkey building.
   ```shell
   npm run moz-bootstrap
   ```

6. Build Spidermonkey.
   ```shell
   npm run moz-build
   ```
   Optionally, you can choose one target using parameter: `release`, `size`, or `debug`.

7. Build sandbox WebAssembly module.
   ```
   npm run wasm-build
   ```
   Optionally, you can choose one target using parameter: `release`, `size`, or `debug`.

8. ...
