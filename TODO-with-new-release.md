

To get newest sysroot-wasi

 - get task if from:
   https://github.com/mozilla-spidermonkey/sm-wasi-demo/blob/main/data.json
   current: O6GfJrj-Q3C0o2IHT6d-sA

 - Find it on:
   https://firefox-ci-tc.services.mozilla.com/tasks
   current: https://firefox-ci-tc.services.mozilla.com/tasks/O6GfJrj-Q3C0o2IHT6d-sA

 - Go to dependency: toolchain-sysroot-wasm32-wasi-clang-xx
   current: https://firefox-ci-tc.services.mozilla.com/tasks/b1ggAEfgRYaHUiaBIjOpMw
 
 - Download artifact: wasm32-wasi-clang.tar.zst

 - Extract it:
   cd ~/.mozbuild
   tar -xf ~/my/spidermonkey-wasi/sysroot-wasm32-wasi.tar.zst