
# Scripts for managing the Spidermonkey build process

TODO: Move it to main readme file.

I suggest using Docker to build the Spidermonkey.

1. Clone repository from Github to `../gecko-dev`:

   ```shell
   scripts/mozbuild/download.sh
   ```

2. Bootstrap your system (install dependencies and tools needed for the build process):

   ```shell
   scripts/mozbuild/bootstrap.sh
   ```

3. Do the build:

   ```shell
   scripts/mozbuild/build.sh release
   ```

   or:

   ```shell
   scripts/mozbuild/build.sh debug
   ```
