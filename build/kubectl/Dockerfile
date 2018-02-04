FROM golang:alpine AS golang

RUN apk add --no-cache git \
    && go get github.com/jwilder/dockerize

FROM node:alpine

RUN apk add --no-cache curl git openssh-client tar openssl \
    && yarn global add yaml-crypt slack-cli yaml-cli \
    && adduser -D -g autoapply autoapply

COPY --from=golang /go/bin/dockerize /usr/local/bin/

ENV KUBECTL_URL "https://storage.googleapis.com/kubernetes-release/release/v1.9.0/bin/linux/amd64/kubectl"
RUN curl --fail "${KUBECTL_URL}" > /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl

RUN yarn global add 'autoapply@0.7.0'

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "autoapply" ]
