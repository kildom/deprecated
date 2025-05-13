
# Links
* Sample Docker file: https://github.com/proudier/docker-firefox-build/blob/master/Dockerfile
* Rust Docker image: https://hub.docker.com/_/rust
* Run the Docker daemon as a non-root user (Rootless mode): https://docs.docker.com/engine/security/rootless/
* Firefox releases: https://hg.mozilla.org/releases/mozilla-release/tags
* Utilities to compile SpiderMonkey to wasm32-wasi: https://github.com/bytecodealliance/spidermonkey-wasm-build
* SpiderMonkey Embedding Resources: https://github.com/mozilla-spidermonkey/spidermonkey-embedding-examples


# Commands to build engine:

```bash
git clone https://github.com/bytecodealliance/spidermonkey-wasm-build/
mkdir obj
cd mozilla-unified/
./mach --no-interactive bootstrap --application-choice=js
export MOZ_OBJDIR=`realpath ../obj`
export MOZCONFIG=`realpath ../spidermonkey-wasm-build/mozconfigs/release`
./mach build
cd ../obj
ls
```
