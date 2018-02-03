FROM node:alpine

RUN apk add --no-cache curl git openssh-client tar openssl \
    && yarn global add yaml-crypt slack-cli yaml-cli \
    && adduser -D -g autoapply autoapply

ENV HELM_URL "https://raw.githubusercontent.com/kubernetes/helm/master/scripts/get"
RUN curl --fail "${HELM_URL}" | /bin/sh

RUN yarn global add 'autoapply@0.6.6'

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "autoapply" ]
