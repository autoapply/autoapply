FROM node:alpine

RUN apk add --no-cache curl git openssh-client tar openssl \
    && yarn global add yaml-crypt slack-cli yaml-cli \
    && adduser -D -g autoapply autoapply

ENV HELM_URL "https://raw.githubusercontent.com/kubernetes/helm/master/scripts/get"
RUN curl --fail "${HELM_URL}" | /bin/sh

ENV SOPS_URL "https://github.com/mozilla/sops/releases/download/3.0.2/sops-3.0.2.linux"
RUN curl --fail -L "${SOPS_URL}" > /usr/local/bin/sops \
    && chmod +x /usr/local/bin/sops

RUN yarn global add 'autoapply@0.7.1'

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "autoapply" ]
