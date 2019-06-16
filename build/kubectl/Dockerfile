FROM golang:alpine AS golang

RUN apk add --no-cache git \
    && go get github.com/jwilder/dockerize

FROM node:alpine

RUN apk add --no-cache curl git openssh-client tar openssl tini \
    && yarn global add yaml-crypt \
    && adduser -D -g autoapply autoapply

COPY --from=golang /go/bin/dockerize /usr/local/bin/

ENV KUBECTL_URL "https://storage.googleapis.com/kubernetes-release/release/v1.14.3/bin/linux/amd64/kubectl"
RUN curl --fail "${KUBECTL_URL}" > /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl

ENV SOPS_URL "https://github.com/mozilla/sops/releases/download/3.3.1/sops-3.3.1.linux"
RUN curl --fail -L "${SOPS_URL}" > /usr/local/bin/sops \
    && chmod +x /usr/local/bin/sops

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src \
    && autoapply --version

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]
