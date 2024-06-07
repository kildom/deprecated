FROM rust:1.78.0-bookworm

ENV SHELL /bin/bash

RUN mkdir -p /usr/local/src
WORKDIR /usr/local/src

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN bash --login -c 'nvm install 18'
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get -y -qq install python3 python3-pip python-is-python3 wget clang llvm
RUN wget -q https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O /tmp/bootstrap.py
RUN cd /usr/local/src && python /tmp/bootstrap.py --application-choice=js --no-interactive --vcs=git
RUN rustup target add wasm32-wasi
RUN mkdir obj
COPY mozrelease /usr/local/src/obj/mozrelease
RUN cd mozilla-unified/ && ./mach --no-interactive bootstrap --application-choice=js
COPY 0001-Patch-cargos.patch /usr/local/src/0001-Patch-cargos.patch
RUN cd mozilla-unified/ && git apply ../0001-Patch-cargos.patch
RUN cd mozilla-unified/ && MOZ_OBJDIR=/usr/local/src/obj MOZCONFIG=/usr/local/src/obj/mozrelease ./mach build
RUN wget https://github.com/WebAssembly/binaryen/releases/download/version_117/binaryen-version_117-x86_64-linux.tar.gz && tar -xf binaryen-version_117-x86_64-linux.tar.gz

# SSH
RUN DEBIAN_FRONTEND=noninteractive apt-get -y -qq install openssh-server
RUN mkdir /var/run/sshd
RUN echo 'root:12345678' | chpasswd
RUN echo '\nPermitRootLogin yes' >> /etc/ssh/sshd_config
#RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd
EXPOSE 22
#CMD ["/usr/sbin/sshd", "-D"]
