FROM rust:1.78.0-bookworm

ENV SHELL /bin/bash

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt update && \
    DEBIAN_FRONTEND=noninteractive apt install -y -qq sudo python3 python3-pip python-is-python3 \
        wget curl findutils gzip libxml2 m4 make perl tar unzip watchman

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN bash --login -c 'nvm install 18'
RUN rustup target add wasm32-wasi

RUN mkdir -p /usr/local/tools && \
    cd /usr/local/tools && \
    wget https://github.com/WebAssembly/binaryen/releases/download/version_117/binaryen-version_117-x86_64-linux.tar.gz && \
    tar -xf binaryen-version_117-x86_64-linux.tar.gz && \
    rm *.tar.gz && \
    mv binaryen-* binaryen

RUN cd /usr/local/tools && \
    wget https://github.com/WebAssembly/wabt/releases/download/1.0.35/wabt-1.0.35-ubuntu-20.04.tar.gz && \
    tar -xf wabt-1.0.35-ubuntu-20.04.tar.gz && \
    rm *.tar.gz && \
    mv wabt-* wabt

ENV PATH="${PATH}:/usr/local/tools/wabt/bin:/usr/local/tools/binaryen/bin"
