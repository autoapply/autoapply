FROM node:12-alpine

RUN apk add --no-cache curl git openssh-client tar openssl tini \
    && yarn global add yaml-crypt@0.7.1 \
    && adduser -D -g autoapply autoapply

RUN curl --fail -L \
    "https://raw.githubusercontent.com/helm/helm/master/scripts/get" | /bin/sh

RUN curl --fail -L \
    "https://github.com/mozilla/sops/releases/download/v3.6.1/sops-v3.6.1.linux" \
    > /usr/local/bin/sops \
    && chmod +x /usr/local/bin/sops

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src \
    && autoapply --version

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]
