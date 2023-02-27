

URL=https://github.com/WebAssembly/wabt/releases/download/1.0.32/wabt-1.0.32-ubuntu.tar.gz

wget $URL -O wabt.tar.gz

mkdir -p wabt
tar xzf wabt.tar.gz --strip-components=1 -C wabt
rm wabt.tar.gz

