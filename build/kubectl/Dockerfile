FROM node:20.2-alpine

RUN apk add --no-cache curl git openssh-client tar openssl tini gnupg \
    && yarn global add yaml-crypt@0.7.7 \
    && adduser -D -u 1001 -g autoapply autoapply

RUN curl --fail -L \
    "https://storage.googleapis.com/kubernetes-release/release/v1.27.3/bin/linux/amd64/kubectl" \
    > /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl

RUN curl --fail -L \
    "https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux" \
    > /usr/local/bin/sops \
    && chmod +x /usr/local/bin/sops

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src \
    && autoapply --version

USER 1001:1001
WORKDIR /home/autoapply
ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]
